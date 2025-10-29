import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useRouter } from 'expo-router';
import React, { useEffect, useState } from 'react';
import { Alert, ActivityIndicator, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { API_ENDPOINTS } from '../config/api';

export default function Security() {
  const router = useRouter();
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
  
  // Password visibility states - separate for each field
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [showCurrentPassword, setShowCurrentPassword] = useState(false);

  useEffect(() => {
    loadUserInfo();
  }, []);

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
    if (!currentPassword || !newPassword || !confirmPassword) {
      Alert.alert('Error', 'Please fill in all password fields');
      return;
    }

    if (newPassword !== confirmPassword) {
      Alert.alert('Error', 'New passwords do not match');
      return;
    }

    if (newPassword.length < 6) {
      Alert.alert('Error', 'Password must be at least 6 characters long');
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
        Alert.alert('Error', data.message || 'Failed to change password');
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
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity style={styles.backButton} onPress={() => router.back()}>
          <Ionicons name="arrow-back" size={24} color="#000" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Security</Text>
        <View style={styles.placeholder} />
      </View>

      {/* Security Options */}
      <View style={styles.securityContainer}>
        {/* Username Section */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Username</Text>
          <Text style={styles.sectionValue}>{username}</Text>
        </View>

        {/* Email Section */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Email</Text>
          <Text style={styles.sectionValue}>{email}</Text>
          
          {showEmailChange ? (
            <View style={styles.emailChangeForm}>
              <TextInput
                style={styles.emailInput}
                placeholder="New email address"
                placeholderTextColor="#999"
                value={newEmail}
                onChangeText={setNewEmail}
                keyboardType="email-address"
                autoCapitalize="none"
                autoCorrect={false}
                editable={!loading}
              />
              <View style={styles.emailButtons}>
                <TouchableOpacity
                  style={styles.cancelButton}
                  onPress={() => {
                    setShowEmailChange(false);
                    setNewEmail('');
                  }}
                  disabled={loading}
                >
                  <Text style={styles.cancelButtonText}>Cancel</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.saveButton, loading && styles.disabledButton]}
                  onPress={handleRequestEmailChange}
                  disabled={loading}
                >
                  {loading ? (
                    <ActivityIndicator size="small" color="#fff" />
                  ) : (
                    <Text style={styles.saveButtonText}>Send Confirmation</Text>
                  )}
                </TouchableOpacity>
              </View>
            </View>
          ) : (
            <TouchableOpacity
              style={styles.changeButton}
              onPress={() => setShowEmailChange(true)}
              disabled={loading}
            >
              <Text style={styles.changeButtonText}>Change</Text>
            </TouchableOpacity>
          )}
        </View>

        {/* Password Change Section */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Change Password</Text>
          
          {showPasswordChange ? (
            <View style={styles.passwordChangeForm}>
              <View style={styles.passwordInputContainer}>
                <TextInput
                  style={styles.passwordInput}
                  placeholder="Current password"
                  placeholderTextColor="#999"
                  secureTextEntry={!showCurrentPassword}
                  value={currentPassword}
                  onChangeText={setCurrentPassword}
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
                      color="#666"
                    />
                  </TouchableOpacity>
                )}
              </View>
              
              <View style={styles.passwordInputContainer}>
                <TextInput
                  style={styles.passwordInput}
                  placeholder="New password"
                  placeholderTextColor="#999"
                  secureTextEntry={!showNewPassword}
                  value={newPassword}
                  onChangeText={setNewPassword}
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
                      color="#666"
                    />
                  </TouchableOpacity>
                )}
              </View>
              
              <View style={styles.passwordInputContainer}>
                <TextInput
                  style={styles.passwordInput}
                  placeholder="Confirm new password"
                  placeholderTextColor="#999"
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
                      color="#666"
                    />
                  </TouchableOpacity>
                )}
              </View>
              
              <View style={styles.passwordButtons}>
                <TouchableOpacity
                  style={styles.cancelButton}
                  onPress={() => {
                    setShowPasswordChange(false);
                    setCurrentPassword('');
                    setNewPassword('');
                    setConfirmPassword('');
                  }}
                  disabled={loading}
                >
                  <Text style={styles.cancelButtonText}>Cancel</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.saveButton, loading && styles.disabledButton]}
                  onPress={handleChangePassword}
                  disabled={loading}
                >
                  {loading ? (
                    <ActivityIndicator size="small" color="#fff" />
                  ) : (
                    <Text style={styles.saveButtonText}>Save</Text>
                  )}
                </TouchableOpacity>
              </View>
            </View>
          ) : (
            <TouchableOpacity
              style={styles.changeButton}
              onPress={() => setShowPasswordChange(true)}
              disabled={loading}
            >
              <Text style={styles.changeButtonText}>Change</Text>
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
    backgroundColor: '#F4C2C2',
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
    borderBottomColor: '#E0E0E0',
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 8,
  },
  sectionValue: {
    fontSize: 16,
    color: '#666',
  },
  emailChangeForm: {
    marginTop: 15,
  },
  emailInput: {
    borderWidth: 1,
    borderColor: '#E0E0E0',
    borderRadius: 8,
    padding: 12,
    marginBottom: 10,
    fontSize: 16,
    backgroundColor: '#fff',
  },
  passwordChangeForm: {
    marginTop: 15,
  },
  passwordInputContainer: {
    position: 'relative',
    marginBottom: 10,
  },
  passwordInput: {
    borderWidth: 1,
    borderColor: '#E0E0E0',
    borderRadius: 8,
    padding: 12,
    paddingRight: 45,
    fontSize: 16,
    backgroundColor: '#fff',
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
    borderColor: '#E0E0E0',
    backgroundColor: '#fff',
  },
  cancelButtonText: {
    color: '#666',
    fontSize: 16,
  },
  saveButton: {
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 8,
    backgroundColor: '#007AFF',
  },
  disabledButton: {
    opacity: 0.6,
  },
  saveButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  changeButton: {
    alignSelf: 'flex-start',
    marginTop: 10,
  },
  changeButtonText: {
    color: '#007AFF',
    fontSize: 16,
    fontWeight: '600',
  },
});
