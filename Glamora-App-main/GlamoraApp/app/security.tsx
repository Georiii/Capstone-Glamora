import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useRouter } from 'expo-router';
import React, { useEffect, useState } from 'react';
import { Alert, ActivityIndicator, StyleSheet, Text, TextInput, TouchableOpacity, View, Animated, Easing } from 'react-native';
import { API_ENDPOINTS } from '../config/api';
import { useTheme } from './contexts/ThemeContext';

export default function Security() {
  const router = useRouter();
  const { theme } = useTheme();
  const [username, setUsername] = useState('Glamora');
  const [email, setEmail] = useState('Glamora@gmail.com');
  const [originalEmail, setOriginalEmail] = useState('');
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPasswordChange, setShowPasswordChange] = useState(false);
  const [showEmailChange, setShowEmailChange] = useState(false);
  const [newEmail, setNewEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [currentPasswordError, setCurrentPasswordError] = useState('');
  // Password strength (reuse from register.tsx)
  const [passwordStrength, setPasswordStrength] = useState('');
  const [animStrength] = useState(new Animated.Value(0));
  const [shakeAnim] = useState(new Animated.Value(0));
  
  // Password visibility states - separate for each field
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [showCurrentPassword, setShowCurrentPassword] = useState(false);

  useEffect(() => {
    loadUserInfo();
  }, []);

  // Evaluate password strength
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

  // Animate strength bar and shake on weak
  useEffect(() => {
    Animated.timing(animStrength, {
      toValue: passwordStrength === 'weak' ? 0 : passwordStrength === 'medium' ? 0.5 : 1,
      duration: 450,
      easing: Easing.inOut(Easing.ease),
      useNativeDriver: false,
    }).start();

    if (passwordStrength === 'weak' && newPassword.length > 0) {
      Animated.sequence([
        Animated.timing(shakeAnim, { toValue: 5, duration: 50, useNativeDriver: true }),
        Animated.timing(shakeAnim, { toValue: -5, duration: 50, useNativeDriver: true }),
        Animated.timing(shakeAnim, { toValue: 3, duration: 50, useNativeDriver: true }),
        Animated.timing(shakeAnim, { toValue: 0, duration: 50, useNativeDriver: true }),
      ]).start();
    }
  }, [animStrength, passwordStrength, newPassword, shakeAnim]);

  const animatedWidth = animStrength.interpolate({
    inputRange: [0, 0.5, 1],
    outputRange: ['30%', '65%', '100%'],
  });

  const animatedColor = animStrength.interpolate({
    inputRange: [0, 0.5, 1],
    outputRange: ['#F15A5A', '#FFD166', '#06D6A0'],
  });

  const loadUserInfo = async () => {
    try {
      const userStr = await AsyncStorage.getItem('user');
      if (userStr) {
        const user = JSON.parse(userStr);
        setUsername(user.name || 'Glamora');
        setEmail(user.email || 'Glamora@gmail.com');
        setOriginalEmail(user.email || 'Glamora@gmail.com');
      }
      
      const token = await AsyncStorage.getItem('token');
      if (!token) {
        Alert.alert('Authentication Required', 'Please log in to access security settings.', [
          { text: 'OK', onPress: () => router.push('/login') }
        ]);
      }
    } catch (error) {
      console.error('Error loading user info:', error);
    }
  };

  const handleRequestEmailChange = async () => {
    if (!newEmail || !newEmail.trim()) {
      Alert.alert('Error', 'Please enter a new email address');
      return;
    }

    // Basic email validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(newEmail)) {
      Alert.alert('Error', 'Please enter a valid email address');
      return;
    }

    if (newEmail.toLowerCase() === email.toLowerCase()) {
      Alert.alert('Error', 'New email must be different from current email');
      return;
    }

    setLoading(true);
    try {
      const token = await AsyncStorage.getItem('token');
      if (!token) {
        Alert.alert('Error', 'Authentication required. Please log in again.');
        router.push('/login');
        return;
      }

      const response = await fetch(API_ENDPOINTS.requestEmailChange, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ newEmail: newEmail.trim() })
      });

      const data = await response.json();

      if (!response.ok) {
        if (response.status === 429) {
          Alert.alert(
            'Rate Limit Exceeded',
            data.message || 'Please wait before requesting another email change.',
            [{ text: 'OK' }]
          );
        } else {
          Alert.alert('Error', data.message || 'Failed to request email change');
        }
        return;
      }

      Alert.alert(
        'Confirmation Email Sent',
        `A confirmation email has been sent to ${data.currentEmail || email}. Please check your inbox and click the confirmation link to complete the email change.`,
        [
          {
            text: 'OK',
            onPress: () => {
              setShowEmailChange(false);
              setNewEmail('');
            }
          }
        ]
      );
    } catch (error: any) {
      console.error('Error requesting email change:', error);
      Alert.alert(
        'Error',
        error.message?.includes('Network request failed')
          ? 'Unable to connect to server. Please check your internet connection.'
          : 'Failed to request email change. Please try again.'
      );
    } finally {
      setLoading(false);
    }
  };

  const handleChangePassword = async () => {
    setCurrentPasswordError('');
    if (!currentPassword || !newPassword || !confirmPassword) {
      Alert.alert('Error', 'Please fill in all password fields');
      return;
    }

    if (newPassword !== confirmPassword) {
      Alert.alert('Error', 'New passwords do not match');
      return;
    }

    // Enforce strong password rules (same as register.tsx)
    if (passwordStrength === 'weak' || passwordStrength === '') {
      Alert.alert('Weak password', 'Password is not strong enough. Please follow the password requirements.');
      return;
    }

    setLoading(true);
    try {
      const token = await AsyncStorage.getItem('token');
      if (!token) {
        Alert.alert('Error', 'Authentication required. Please log in again.');
        router.push('/login');
        return;
      }

      const response = await fetch(API_ENDPOINTS.changePassword, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          currentPassword,
          newPassword
        })
      });

      const data = await response.json();

      if (!response.ok) {
        if (response.status === 401 && (data?.message?.toLowerCase()?.includes('current password') || true)) {
          setCurrentPasswordError('Invalid password');
        } else {
          Alert.alert('Error', data.message || 'Failed to change password');
        }
        return;
      }

      Alert.alert(
        'Success',
        'Password changed successfully!',
        [
          {
            text: 'OK',
            onPress: () => {
              setShowPasswordChange(false);
              setCurrentPassword('');
              setNewPassword('');
              setConfirmPassword('');
            }
          }
        ]
      );
    } catch (error: any) {
      console.error('Error changing password:', error);
      Alert.alert(
        'Error',
        error.message?.includes('Network request failed')
          ? 'Unable to connect to server. Please check your internet connection.'
          : 'Failed to change password. Please try again.'
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={[styles.container, { backgroundColor: theme.colors.bodyBackground }]}>
      {/* Header */}
      <View style={[styles.header, { backgroundColor: theme.colors.headerBackground }]}>
        <TouchableOpacity style={styles.backButton} onPress={() => router.back()}>
          <Ionicons name="arrow-back" size={24} color={theme.colors.icon} />
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { color: theme.colors.headerText }]}>Security</Text>
        <View style={styles.placeholder} />
      </View>

      {/* Security Options */}
      <View style={styles.securityContainer}>
        {/* Username Section */}
        <View style={[styles.section, { backgroundColor: theme.colors.containerBackground, borderColor: theme.colors.border }]}>
          <Text style={[styles.sectionTitle, { color: theme.colors.primaryText }]}>Username</Text>
          <Text style={[styles.sectionValue, { color: theme.colors.secondaryText }]}>{username}</Text>
        </View>

        {/* Email Section */}
        <View style={[styles.section, { backgroundColor: theme.colors.containerBackground, borderColor: theme.colors.border }]}>
          <Text style={[styles.sectionTitle, { color: theme.colors.primaryText }]}>Email</Text>
          <Text style={[styles.sectionValue, { color: theme.colors.secondaryText }]}>{email}</Text>
          
          {showEmailChange ? (
            <View style={styles.emailChangeForm}>
              <TextInput
                style={[styles.emailInput, { backgroundColor: theme.colors.containerBackground, color: theme.colors.primaryText, borderColor: theme.colors.border }]}
                placeholder="New email address"
                placeholderTextColor={theme.colors.secondaryText}
                value={newEmail}
                onChangeText={setNewEmail}
                keyboardType="email-address"
                autoCapitalize="none"
                autoCorrect={false}
                editable={!loading}
              />
              <View style={styles.emailButtons}>
                <TouchableOpacity
                  style={[styles.cancelButton, { backgroundColor: theme.colors.containerBackground }]}
                  onPress={() => {
                    setShowEmailChange(false);
                    setNewEmail('');
                  }}
                  disabled={loading}
                >
                  <Text style={[styles.cancelButtonText, { color: theme.colors.primaryText }]}>Cancel</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.saveButton, { backgroundColor: theme.colors.buttonBackground }, loading && styles.disabledButton]}
                  onPress={handleRequestEmailChange}
                  disabled={loading}
                >
                  {loading ? (
                    <ActivityIndicator size="small" color={theme.colors.buttonText} />
                  ) : (
                    <Text style={[styles.saveButtonText, { color: theme.colors.buttonText }]}>Send Confirmation</Text>
                  )}
                </TouchableOpacity>
              </View>
            </View>
          ) : (
            <TouchableOpacity
              style={[styles.changeButton, { backgroundColor: theme.colors.buttonBackground }]}
              onPress={() => setShowEmailChange(true)}
              disabled={loading}
            >
              <Text style={[styles.changeButtonText, { color: theme.colors.buttonText }]}>Change</Text>
            </TouchableOpacity>
          )}
        </View>

        {/* Password Change Section */}
        <View style={[styles.section, { backgroundColor: theme.colors.containerBackground, borderColor: theme.colors.border }]}>
          <Text style={[styles.sectionTitle, { color: theme.colors.primaryText }]}>Change Password</Text>
          
          {showPasswordChange ? (
            <View style={styles.passwordChangeForm}>
              <View style={[styles.passwordInputContainer, { backgroundColor: theme.colors.containerBackground, borderColor: theme.colors.border }]}>
                <TextInput
                  style={[styles.passwordInput, { color: theme.colors.primaryText }]}
                  placeholder="Current password"
                  placeholderTextColor={theme.colors.secondaryText}
                  secureTextEntry={!showCurrentPassword}
                  value={currentPassword}
                  onChangeText={(t) => { setCurrentPassword(t); setCurrentPasswordError(''); }}
                  editable={!loading}
                />
                {currentPassword.length > 0 && (
                  <TouchableOpacity
                    style={styles.eyeIcon}
                    onPress={() => setShowCurrentPassword(!showCurrentPassword)}
                  >
                    <Ionicons
                      name={showCurrentPassword ? 'eye-off' : 'eye'}
                      size={20}
                      color={theme.colors.secondaryText}
                    />
                  </TouchableOpacity>
                )}
              </View>
              {!!currentPasswordError && (
                <Text style={[styles.inlineError, { color: '#F15A5A' }]}>{currentPasswordError}</Text>
              )}
              
              <View style={[styles.passwordInputContainer, { backgroundColor: theme.colors.containerBackground, borderColor: theme.colors.border }]}>
                <TextInput
                  style={[styles.passwordInput, { color: theme.colors.primaryText }]}
                  placeholder="New password"
                  placeholderTextColor={theme.colors.secondaryText}
                  secureTextEntry={!showNewPassword}
                  value={newPassword}
                  onChangeText={(t) => {
                    setNewPassword(t);
                    setPasswordStrength(evaluatePassword(t));
                  }}
                  editable={!loading}
                />
                {newPassword.length > 0 && (
                  <TouchableOpacity
                    style={styles.eyeIcon}
                    onPress={() => setShowNewPassword(!showNewPassword)}
                  >
                    <Ionicons
                      name={showNewPassword ? 'eye-off' : 'eye'}
                      size={20}
                      color={theme.colors.secondaryText}
                    />
                  </TouchableOpacity>
                )}
              </View>
              <View style={styles.pwGuidelines}>
                <Text style={[styles.pwGuidelineHeader, { color: theme.colors.primaryText }]}>Password must be:</Text>
                <View style={styles.pwRules}>
                  <Text style={[styles.pwRule, { color: theme.colors.secondaryText }]}>• At least 8 characters</Text>
                  <Text style={[styles.pwRule, { color: theme.colors.secondaryText }]}>• One uppercase letter (A-Z)</Text>
                  <Text style={[styles.pwRule, { color: theme.colors.secondaryText }]}>• One lowercase letter (a-z)</Text>
                  <Text style={[styles.pwRule, { color: theme.colors.secondaryText }]}>• One number (0-9)</Text>
                  <Text style={[styles.pwRule, { color: theme.colors.secondaryText }]}>• One special character (!,@,#,$, etc.)</Text>
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
                {passwordStrength === 'weak' && newPassword.length > 0 && (
                  <Text style={styles.weakPasswordText}>Password is weak</Text>
                )}
              </View>
              
              <View style={[styles.passwordInputContainer, { backgroundColor: theme.colors.containerBackground, borderColor: theme.colors.border }]}>
                <TextInput
                  style={[styles.passwordInput, { color: theme.colors.primaryText }]}
                  placeholder="Confirm new password"
                  placeholderTextColor={theme.colors.secondaryText}
                  secureTextEntry={!showConfirmPassword}
                  value={confirmPassword}
                  onChangeText={setConfirmPassword}
                  editable={!loading}
                />
                {confirmPassword.length > 0 && (
                  <TouchableOpacity
                    style={styles.eyeIcon}
                    onPress={() => setShowConfirmPassword(!showConfirmPassword)}
                  >
                    <Ionicons
                      name={showConfirmPassword ? 'eye-off' : 'eye'}
                      size={20}
                      color={theme.colors.secondaryText}
                    />
                  </TouchableOpacity>
                )}
              </View>
              
              <View style={styles.passwordButtons}>
                <TouchableOpacity
                  style={[styles.cancelButton, { backgroundColor: theme.colors.containerBackground }]}
                  onPress={() => {
                    setShowPasswordChange(false);
                    setCurrentPassword('');
                    setNewPassword('');
                    setConfirmPassword('');
                  }}
                  disabled={loading}
                >
                  <Text style={[styles.cancelButtonText, { color: theme.colors.primaryText }]}>Cancel</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.saveButton, { backgroundColor: theme.colors.buttonBackground }, loading && styles.disabledButton]}
                  onPress={handleChangePassword}
                  disabled={loading}
                >
                  {loading ? (
                    <ActivityIndicator size="small" color={theme.colors.buttonText} />
                  ) : (
                    <Text style={[styles.saveButtonText, { color: theme.colors.buttonText }]}>Save</Text>
                  )}
                </TouchableOpacity>
              </View>
            </View>
          ) : (
            <TouchableOpacity
              style={[styles.changeButton, { backgroundColor: theme.colors.buttonBackground }]}
              onPress={() => setShowPasswordChange(true)}
              disabled={loading}
            >
              <Text style={[styles.changeButtonText, { color: theme.colors.buttonText }]}>Change</Text>
            </TouchableOpacity>
          )}
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingTop: 40,
    paddingBottom: 20,
  },
  backButton: {
    padding: 10,
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    textAlign: 'center',
    flex: 1,
  },
  placeholder: {
    width: 40,
  },
  securityContainer: {
    flex: 1,
    paddingHorizontal: 20,
  },
  section: {
    paddingVertical: 20,
    borderBottomWidth: 1,
    borderRadius: 12,
    marginBottom: 10,
    padding: 16,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 8,
  },
  sectionValue: {
    fontSize: 16,
  },
  emailChangeForm: {
    marginTop: 15,
  },
  emailInput: {
    borderWidth: 1,
    borderRadius: 8,
    padding: 12,
    marginBottom: 10,
    fontSize: 16,
  },
  passwordChangeForm: {
    marginTop: 15,
  },
  passwordInputContainer: {
    position: 'relative',
    marginBottom: 10,
    borderWidth: 1,
    borderRadius: 8,
  },
  passwordInput: {
    padding: 12,
    paddingRight: 45,
    fontSize: 16,
  },
  eyeIcon: {
    position: 'absolute',
    right: 12,
    top: 12,
    padding: 4,
  },
  passwordButtons: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: 10,
  },
  emailButtons: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: 10,
  },
  cancelButton: {
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 8,
    borderWidth: 1,
  },
  cancelButtonText: {
    fontSize: 16,
  },
  saveButton: {
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 8,
  },
  disabledButton: {
    opacity: 0.6,
  },
  saveButtonText: {
    fontSize: 16,
    fontWeight: '600',
  },
  changeButton: {
    alignSelf: 'flex-start',
    marginTop: 10,
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 8,
  },
  changeButtonText: {
    fontSize: 16,
    fontWeight: '600',
  },
  inlineError: {
    marginTop: -4,
    marginBottom: 6,
    fontSize: 12,
    fontWeight: '600',
  },
  // Password strength visuals (adapted from register.tsx)
  pwGuidelines: {
    width: '100%',
    marginTop: 6,
    marginBottom: 8,
  },
  pwGuidelineHeader: {
    fontWeight: '600',
    marginBottom: 6,
    fontSize: 13,
  },
  pwRules: {
    marginBottom: 8,
  },
  pwRule: {
    fontSize: 12,
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
    fontSize: 12,
    fontWeight: '600',
    marginTop: 4,
  },
});
