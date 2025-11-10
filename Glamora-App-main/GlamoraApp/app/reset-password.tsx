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
import { API_ENDPOINTS } from '../config/api';

export default function ResetPassword() {
  const router = useRouter();
  const { token } = useLocalSearchParams();
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
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

  const handleResetPassword = async () => {
    if (!newPassword.trim() || !confirmPassword.trim()) {
      Alert.alert('Error', 'Please fill in all fields.');
      return;
    }

    if (newPassword !== confirmPassword) {
      Alert.alert('Error', 'Passwords do not match.');
      return;
    }

    if (newPassword.length < 6) {
      Alert.alert('Error', 'Password must be at least 6 characters long.');
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
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#4B2E2B" />
        <Text style={styles.loadingText}>Verifying reset link...</Text>
      </View>
    );
  }

  if (!tokenValid) {
    return (
      <View style={styles.container}>
        <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
          <Image source={require('../assets/logo.png')} style={styles.logo} resizeMode="contain" />
          
          <View style={styles.errorContainer}>
            <Text style={styles.errorIcon}>⚠️</Text>
            <Text style={styles.errorTitle}>Link Expired</Text>
            <Text style={styles.errorMessage}>
              This password reset link has expired or is invalid. 
              Please request a new one to reset your password.
            </Text>
          </View>

          <TouchableOpacity 
            style={styles.button} 
            onPress={() => router.push('/forgotpass')}
          >
            <Text style={styles.buttonText}>Request New Reset Link</Text>
          </TouchableOpacity>

          <View style={styles.footer}>
            <Text style={styles.footerText}>Remember your password? </Text>
            <TouchableOpacity onPress={() => router.push('/login')}>
              <Text style={styles.loginText}>Login</Text>
            </TouchableOpacity>
          </View>
        </ScrollView>
      </View>
    );
  }

  return (
    <KeyboardAvoidingView 
      style={styles.container} 
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        <Image source={require('../assets/logo.png')} style={styles.logo} resizeMode="contain" />
        
        <Text style={styles.header}>Reset Password</Text>
        <Text style={styles.subtext}>
          Enter your new password for {userEmail}
        </Text>

        <View style={styles.inputContainer}>
          <TextInput
            style={styles.input}
            placeholder="New Password"
            placeholderTextColor="rgba(255, 255, 255, 0.7)"
            value={newPassword}
            onChangeText={setNewPassword}
            secureTextEntry
            autoCapitalize="none"
          />

          <TextInput
            style={styles.input}
            placeholder="Confirm New Password"
            placeholderTextColor="rgba(255, 255, 255, 0.7)"
            value={confirmPassword}
            onChangeText={setConfirmPassword}
            secureTextEntry
            autoCapitalize="none"
          />
        </View>

        <TouchableOpacity 
          style={[styles.resetButton, isLoading && styles.resetButtonDisabled]} 
          onPress={handleResetPassword}
          disabled={isLoading}
        >
          {isLoading ? (
            <ActivityIndicator size="small" color="#000" />
          ) : (
            <Text style={styles.resetButtonText}>Reset Password</Text>
          )}
        </TouchableOpacity>

        <View style={styles.footer}>
          <Text style={styles.footerText}>Remember your password? </Text>
          <TouchableOpacity onPress={() => router.push('/login')}>
            <Text style={styles.loginText}>Login</Text>
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
        <View style={styles.modalOverlay}>
          <View style={styles.modalContainer}>
            <View style={styles.successIconContainer}>
              <Text style={styles.successIcon}>✓</Text>
            </View>
            
            <Text style={styles.modalTitle}>Success!</Text>
            <Text style={styles.modalMessage}>
              Your password has been reset successfully. You can now log in with your new password.
            </Text>
            
            <TouchableOpacity 
              style={styles.doneButton}
              onPress={() => {
                setShowSuccessModal(false);
                router.push('/login');
              }}
            >
              <Text style={styles.doneButtonText}>Done</Text>
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
