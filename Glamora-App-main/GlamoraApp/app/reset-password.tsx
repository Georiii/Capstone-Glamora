import { useLocalSearchParams, useRouter } from 'expo-router';
import React, { useEffect, useState } from 'react';
import {
    ActivityIndicator,
    Alert,
    Image,
    KeyboardAvoidingView,
    Modal,
    Platform,
    ScrollView,
    StyleSheet,
    Text,
    TextInput,
    TouchableOpacity,
    View
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { API_ENDPOINTS } from '../config/api';
import { useTheme } from './contexts/ThemeContext';

export default function ResetPassword() {
  const router = useRouter();
  const { theme } = useTheme();
  const { token } = useLocalSearchParams();
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [passwordStrength, setPasswordStrength] = useState<'weak' | 'medium' | 'strong' | ''>('');
  const [isLoading, setIsLoading] = useState(false);
  const [isVerifying, setIsVerifying] = useState(true);
  const [tokenValid, setTokenValid] = useState(false);
  const [userEmail, setUserEmail] = useState('');
  const [showSuccessModal, setShowSuccessModal] = useState(false);

  // Verify token on component mount
  useEffect(() => {
    const verifyToken = async () => {
      if (!token) {
        Alert.alert('Error', 'Invalid reset link. Please request a new password reset.');
        router.push('/forgotpass');
        return;
      }

      try {
        console.log('🔍 Verifying reset token...');
        const response = await fetch(`${API_ENDPOINTS.verifyResetToken}?token=${token}`);
        const data = await response.json();

        if (response.ok && data.valid) {
          console.log('✅ Token is valid for user:', data.email);
          setTokenValid(true);
          setUserEmail(data.email);
        } else {
          console.log('❌ Token verification failed:', data.message);
          Alert.alert(
            'Link Expired',
            data.message || 'Reset link expired or invalid. Please request again.',
            [
              {
                text: 'Request New Link',
                onPress: () => router.push('/forgotpass')
              }
            ]
          );
        }
      } catch (error) {
        console.error('❌ Error verifying token:', error);
        Alert.alert(
          'Error',
          'Network error. Please check your connection.',
          [
            {
              text: 'Try Again',
              onPress: () => router.push('/forgotpass')
            }
          ]
        );
      } finally {
        setIsVerifying(false);
      }
    };

    verifyToken();
  }, [token, router]);

  const evaluatePassword = (pwd: string): 'weak' | 'medium' | 'strong' => {
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

  const onChangeNewPassword = (text: string) => {
    setNewPassword(text);
    if (!text) {
      setPasswordStrength('');
      return;
    }
    setPasswordStrength(evaluatePassword(text));
  };

  const handleResetPassword = async () => {
    if (!newPassword.trim() || !confirmPassword.trim()) {
      Alert.alert('Error', 'Please fill in all fields.');
      return;
    }

    if (newPassword !== confirmPassword) {
      Alert.alert('Error', 'Passwords do not match.');
      return;
    }

    if (newPassword.length < 8) {
      Alert.alert('Error', 'Password must be at least 8 characters long.');
      return;
    }

    if (passwordStrength === 'weak' || passwordStrength === '') {
      Alert.alert('Weak password', 'Password must include uppercase, lowercase, number, and special character.');
      return;
    }

    setIsLoading(true);

    try {
      console.log('🔍 Resetting password...');
      
      const response = await fetch(API_ENDPOINTS.resetPassword, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          token: token,
          newPassword: newPassword.trim(),
          confirmPassword: confirmPassword.trim(),
        }),
      });

      const data = await response.json();
      console.log('🔐 Password reset response:', data);

      if (response.ok && data.success) {
        setShowSuccessModal(true);
      } else {
        Alert.alert('Error', data.message || 'Failed to reset password. Please try again.');
      }
    } catch (error) {
      console.error('❌ Error resetting password:', error);
      Alert.alert('Error', 'Network error. Please check your connection and try again.');
    } finally {
      setIsLoading(false);
    }
  };

  if (isVerifying) {
    return (
      <View style={[styles.loadingContainer, { backgroundColor: theme.colors.bodyBackground }]}>
        <ActivityIndicator size="large" color={theme.colors.accent} />
        <Text style={[styles.loadingText, { color: theme.colors.primaryText }]}>Verifying reset link...</Text>
      </View>
    );
  }

  if (!tokenValid) {
    return (
      <View style={[styles.container, { backgroundColor: theme.colors.bodyBackground }]}>
        <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
          <Image source={require('../assets/logo.png')} style={styles.logo} resizeMode="contain" />
          
          <View style={[styles.errorContainer, { backgroundColor: theme.colors.containerBackground }]}>
            <Text style={styles.errorIcon}>⚠️</Text>
            <Text style={[styles.errorTitle, { color: theme.colors.primaryText }]}>Link Expired</Text>
            <Text style={[styles.errorMessage, { color: theme.colors.secondaryText }]}>
              This password reset link has expired or is invalid. 
              Please request a new one to reset your password.
            </Text>
          </View>

          <TouchableOpacity 
            style={[styles.button, { backgroundColor: theme.colors.buttonBackground }]} 
            onPress={() => router.push('/forgotpass')}
          >
            <Text style={[styles.buttonText, { color: theme.colors.buttonText }]}>Request New Reset Link</Text>
          </TouchableOpacity>

          <View style={styles.footer}>
            <Text style={[styles.footerText, { color: theme.colors.secondaryText }]}>Remember your password? </Text>
            <TouchableOpacity onPress={() => router.push('/login')}>
              <Text style={[styles.loginText, { color: theme.colors.linkText }]}>Login</Text>
            </TouchableOpacity>
          </View>
        </ScrollView>
      </View>
    );
  }

  return (
    <KeyboardAvoidingView 
      style={[styles.container, { backgroundColor: theme.colors.bodyBackground }]} 
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        <Image source={require('../assets/logo.png')} style={styles.logo} resizeMode="contain" />
        
        <Text style={[styles.header, { color: theme.colors.primaryText }]}>Reset Password</Text>
        <Text style={[styles.subtext, { color: theme.colors.secondaryText }]}>
          Enter your new password for {userEmail}
        </Text>

        <View style={styles.inputContainer}>
          <View style={styles.passwordContainer}>
            <TextInput
              style={[styles.input, styles.passwordInput, { backgroundColor: theme.colors.inputBackground, borderColor: theme.colors.border, color: theme.colors.inputText }]}
              placeholder="New Password"
              placeholderTextColor={theme.colors.placeholderText}
              value={newPassword}
              onChangeText={onChangeNewPassword}
              secureTextEntry={!showNewPassword}
              autoCapitalize="none"
            />
            <TouchableOpacity style={styles.eyeIcon} onPress={() => setShowNewPassword(prev => !prev)}>
              <Ionicons name={showNewPassword ? 'eye-off' : 'eye'} size={20} color={theme.colors.secondaryText} />
            </TouchableOpacity>
          </View>

          <View style={styles.guidelineBox}>
            <Text style={[styles.guidelineHeader, { color: theme.colors.primaryText }]}>Password must include:</Text>
            <Text style={[styles.guidelineText, { color: theme.colors.secondaryText }]}>• At least 8 characters</Text>
            <Text style={[styles.guidelineText, { color: theme.colors.secondaryText }]}>• One uppercase (A-Z) and lowercase (a-z)</Text>
            <Text style={[styles.guidelineText, { color: theme.colors.secondaryText }]}>• One number (0-9)</Text>
            <Text style={[styles.guidelineText, { color: theme.colors.secondaryText }]}>• One special character (!,@,#,$,...)</Text>
            {passwordStrength !== '' && (
              <Text style={[
                styles.strengthLabel,
                passwordStrength === 'strong'
                  ? { color: '#06D6A0' }
                  : passwordStrength === 'medium'
                    ? { color: '#FFD166' }
                    : { color: '#F15A5A' }
              ]}>
                Password strength: {passwordStrength.toUpperCase()}
              </Text>
            )}
          </View>

          <View style={styles.passwordContainer}>
            <TextInput
              style={[styles.input, styles.passwordInput, { backgroundColor: theme.colors.inputBackground, borderColor: theme.colors.border, color: theme.colors.inputText }]}
              placeholder="Confirm New Password"
              placeholderTextColor={theme.colors.placeholderText}
              value={confirmPassword}
              onChangeText={setConfirmPassword}
              secureTextEntry={!showConfirmPassword}
              autoCapitalize="none"
            />
            <TouchableOpacity style={styles.eyeIcon} onPress={() => setShowConfirmPassword(prev => !prev)}>
              <Ionicons name={showConfirmPassword ? 'eye-off' : 'eye'} size={20} color={theme.colors.secondaryText} />
            </TouchableOpacity>
          </View>
        </View>

        <TouchableOpacity 
          style={[styles.resetButton, isLoading && styles.resetButtonDisabled, { backgroundColor: theme.colors.buttonBackground }]} 
          onPress={handleResetPassword}
          disabled={isLoading}
        >
          {isLoading ? (
            <ActivityIndicator size="small" color={theme.colors.buttonText} />
          ) : (
            <Text style={[styles.resetButtonText, { color: theme.colors.buttonText }]}>Reset Password</Text>
          )}
        </TouchableOpacity>

        <View style={styles.footer}>
          <Text style={[styles.footerText, { color: theme.colors.secondaryText }]}>Remember your password? </Text>
          <TouchableOpacity onPress={() => router.push('/login')}>
            <Text style={[styles.loginText, { color: theme.colors.linkText }]}>Login</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>

      {/* Success Modal */}
      <Modal
        visible={showSuccessModal}
        transparent={true}
        animationType="fade"
        onRequestClose={() => {
          setShowSuccessModal(false);
          router.push('/login');
        }}
      >
        <View style={[styles.modalOverlay, { backgroundColor: theme.colors.modalOverlay }]}>
          <View style={[styles.modalContainer, { backgroundColor: theme.colors.containerBackground }]}>
            <View style={[styles.successIconContainer, { backgroundColor: theme.colors.accent }]}>
              <Text style={[styles.successIcon, { color: theme.colors.buttonText }]}>✓</Text>
            </View>
            
            <Text style={[styles.modalTitle, { color: theme.colors.primaryText }]}>Success!</Text>
            <Text style={[styles.modalMessage, { color: theme.colors.secondaryText }]}>
              Your password has been reset successfully. You can now log in with your new password.
            </Text>
            
            <TouchableOpacity 
              style={[styles.doneButton, { backgroundColor: theme.colors.buttonBackground }]}
              onPress={() => {
                setShowSuccessModal(false);
                router.push('/login');
              }}
            >
              <Text style={[styles.doneButtonText, { color: theme.colors.buttonText }]}>Done</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F4C2C2',
  },
  loadingContainer: {
    flex: 1,
    backgroundColor: '#F4C2C2',
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 16,
    fontSize: 16,
    color: '#4B2E2B',
  },
  scrollContent: {
    flexGrow: 1,
    padding: 20,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: '100%',
  },
  logo: {
    width: 100,
    height: 100,
    position: 'absolute', 
    top: 10,
    right: 5,
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
    marginBottom: 30,
    textAlign: 'center',
    paddingHorizontal: 20,
  },
  inputContainer: {
    width: '100%',
    alignItems: 'center',
    marginBottom: 20,
  },
  passwordContainer: {
    width: '100%',
    position: 'relative',
  },
  passwordInput: {
    paddingRight: 48,
  },
  eyeIcon: {
    position: 'absolute',
    right: 18,
    top: '50%',
    marginTop: -12,
    padding: 6,
  },
  guidelineBox: {
    width: '100%',
    marginTop: 10,
    marginBottom: 16,
    paddingHorizontal: 12,
  },
  guidelineHeader: {
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 4,
  },
  guidelineText: {
    fontSize: 12,
    marginBottom: 2,
  },
  strengthLabel: {
    marginTop: 6,
    fontSize: 13,
    fontWeight: '600',
  },
  input: {
    width: 270,
    height: 50,
    borderRadius: 20,
    paddingHorizontal: 20,
    backgroundColor: 'rgba(255, 255, 255, 0.4)',
    marginTop: 12,
    color: 'black',
    fontSize: 16,
  },
  resetButton: {
    width: 170,
    height: 40,
    backgroundColor: '#FFE8C8',
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 30,
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
    marginTop: 40,
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
  button: {
    width: 200,
    height: 40,
    backgroundColor: '#FFE8C8',
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 20,
  },
  buttonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#000',
  },
  errorContainer: {
    backgroundColor: 'rgba(255, 255, 255, 0.9)',
    borderRadius: 20,
    padding: 30,
    marginVertical: 20,
    alignItems: 'center',
    width: '90%',
    maxWidth: 400,
  },
  errorIcon: {
    fontSize: 64,
    marginBottom: 20,
  },
  errorTitle: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#4B2E2B',
    marginBottom: 15,
    textAlign: 'center',
  },
  errorMessage: {
    fontSize: 16,
    color: '#666',
    textAlign: 'center',
    lineHeight: 24,
  },
  errorText: {
    fontSize: 18,
    color: 'white',
    textAlign: 'center',
    marginBottom: 20,
  },
  // Success Modal Styles
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  modalContainer: {
    backgroundColor: 'white',
    borderRadius: 20,
    padding: 30,
    width: '90%',
    maxWidth: 400,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 4,
    },
    shadowOpacity: 0.3,
    shadowRadius: 6,
    elevation: 8,
  },
  successIconContainer: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: '#4CAF50',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 20,
  },
  successIcon: {
    fontSize: 48,
    color: 'white',
    fontWeight: 'bold',
  },
  modalTitle: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#4B2E2B',
    marginBottom: 15,
    textAlign: 'center',
  },
  modalMessage: {
    fontSize: 16,
    color: '#666',
    textAlign: 'center',
    lineHeight: 24,
    marginBottom: 30,
    paddingHorizontal: 10,
  },
  doneButton: {
    backgroundColor: '#FFE8C8',
    borderWidth: 2,
    borderColor: '#4B2E2B',
    borderRadius: 25,
    paddingVertical: 14,
    paddingHorizontal: 60,
    alignItems: 'center',
    justifyContent: 'center',
    minWidth: 200,
  },
  doneButtonText: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#4B2E2B',
  },
});
