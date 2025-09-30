import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useRouter } from 'expo-router';
import React, { useEffect, useState } from 'react';
import { Alert, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';

export default function Security() {
  const router = useRouter();
  const [username, setUsername] = useState('Glamora');
  const [email, setEmail] = useState('Glamora@gmail.com');
  const [currentPassword, setCurrentPassword] = useState('********');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPasswordChange, setShowPasswordChange] = useState(false);

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
      }
    } catch (error) {
      console.error('Error loading user info:', error);
    }
  };

  const handleChangePassword = () => {
    if (!newPassword || !confirmPassword) {
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

    Alert.alert(
      'Success',
      'Password changed successfully!',
      [{ text: 'OK', onPress: () => {
        setShowPasswordChange(false);
        setNewPassword('');
        setConfirmPassword('');
      }}]
    );
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
        </View>

        {/* Password Change Section */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Change password</Text>
          <Text style={styles.sectionValue}>{currentPassword}</Text>
          
          {showPasswordChange && (
            <View style={styles.passwordChangeForm}>
              <TextInput
                style={styles.passwordInput}
                placeholder="New password"
                secureTextEntry
                value={newPassword}
                onChangeText={setNewPassword}
              />
              <TextInput
                style={styles.passwordInput}
                placeholder="Confirm new password"
                secureTextEntry
                value={confirmPassword}
                onChangeText={setConfirmPassword}
              />
              <View style={styles.passwordButtons}>
                <TouchableOpacity 
                  style={styles.cancelButton} 
                  onPress={() => {
                    setShowPasswordChange(false);
                    setNewPassword('');
                    setConfirmPassword('');
                  }}
                >
                  <Text style={styles.cancelButtonText}>Cancel</Text>
                </TouchableOpacity>
                <TouchableOpacity 
                  style={styles.saveButton} 
                  onPress={handleChangePassword}
                >
                  <Text style={styles.saveButtonText}>Save</Text>
                </TouchableOpacity>
              </View>
            </View>
          )}
          
          {!showPasswordChange && (
            <TouchableOpacity 
              style={styles.changePasswordButton}
              onPress={() => setShowPasswordChange(true)}
            >
              <Text style={styles.changePasswordButtonText}>Change</Text>
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
  passwordChangeForm: {
    marginTop: 15,
  },
  passwordInput: {
    borderWidth: 1,
    borderColor: '#E0E0E0',
    borderRadius: 8,
    padding: 12,
    marginBottom: 10,
    fontSize: 16,
    backgroundColor: '#fff',
  },
  passwordButtons: {
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
  saveButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  changePasswordButton: {
    alignSelf: 'flex-start',
    marginTop: 10,
  },
  changePasswordButtonText: {
    color: '#007AFF',
    fontSize: 16,
    fontWeight: '600',
  },
});
