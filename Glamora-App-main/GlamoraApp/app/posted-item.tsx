import { Ionicons } from '@expo/vector-icons';
import { router, useLocalSearchParams } from 'expo-router';
import React from 'react';
import { Image, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { useTheme } from './contexts/ThemeContext';

export default function PostedItem() {
  const { theme } = useTheme();
  const params = useLocalSearchParams();
  const { imageUrl, name, description, price, userName, userEmail, userProfilePicture } = params;
  const imageSrc = Array.isArray(imageUrl) ? imageUrl[0] : imageUrl;
  const sellerProfilePic = Array.isArray(userProfilePicture) ? userProfilePicture[0] : userProfilePicture;
  const defaultAvatar = require('../assets/avatar.png');

  return (
    <View style={[styles.container, { backgroundColor: theme.colors.bodyBackground }]}>
      {/* Header */}
      <View style={[styles.header, { backgroundColor: theme.colors.headerBackground }]}>
        <TouchableOpacity onPress={() => router.back()}>
          <Ionicons name="arrow-back" size={28} color={theme.colors.icon} />
        </TouchableOpacity>
        <Text style={[styles.title, { color: theme.colors.headerText }]}>MARKETPLACE</Text>
        <View style={{ width: 28 }} />
      </View>
      {/* Image */}
      <Image source={{ uri: imageSrc }} style={[styles.image, { borderColor: theme.colors.border }]} />
      {/* Details */}
      <Text style={[styles.clothName, { color: theme.colors.primaryText }]}>{name}</Text>
      <Text style={[styles.description, { color: theme.colors.secondaryText }]}>{description}</Text>
      <View style={styles.priceRow}>
        <Text style={[styles.priceLabel, { color: theme.colors.primaryText }]}>Price</Text>
        <Text style={[styles.priceValue, { color: theme.colors.primaryText }]}>₱{price}</Text>
      </View>
      {/* User Info */}
      <View style={styles.userInfoContainer}>
        <Image 
          source={sellerProfilePic ? { uri: sellerProfilePic } : defaultAvatar} 
          style={styles.userAvatar} 
        />
        <View style={styles.sellerTextContainer}>
          <Text style={[styles.userName, { color: theme.colors.primaryText }]} numberOfLines={2}>
            {userName || 'Name'}
          </Text>
          <Text style={[styles.userEmail, { color: theme.colors.secondaryText }]} numberOfLines={2}>
            {userEmail || 'Email'}
          </Text>
        </View>
      </View>
      <TouchableOpacity style={[styles.messageButton, { backgroundColor: theme.colors.buttonBackground }]} onPress={() => router.push({
        pathname: '/message-user',
        params: {
          sellerId: userName,
          sellerEmail: userEmail,
          sellerProfilePicture: sellerProfilePic || defaultAvatar,
          productName: name,
          productImage: imageSrc
        }
      })}>
        <Text style={[styles.messageButtonText, { color: theme.colors.buttonText }]}>Message User</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F4C2C2', padding: 20 },
  header: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    marginBottom: 10, marginTop: 10,
  },
  title: { fontSize: 28, fontWeight: 'bold', color: '#222' },
  image: {
    width: '100%', height: 280, borderRadius: 12, marginBottom: 18, marginTop: 10,
    borderWidth: 2, borderColor: '#222', backgroundColor: '#fff',
    resizeMode: 'contain',
  },
  clothName: { fontSize: 24, fontWeight: 'bold', color: '#222', marginBottom: 6 },
  description: { fontSize: 16, color: '#222', marginBottom: 18 },
  priceRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 24 },
  priceLabel: { fontWeight: 'bold', fontSize: 20, marginRight: 10 },
  priceValue: { fontSize: 20, color: '#222', fontWeight: 'bold' },
  userInfoContainer: { flexDirection: 'row', alignItems: 'center', marginTop: 30 },
  sellerTextContainer: { flex: 1, marginLeft: 12 },
  userAvatar: { width: 48, height: 48, borderRadius: 24 },
  userName: { fontWeight: 'bold', fontSize: 15, color: '#222', flexWrap: 'wrap' },
  userEmail: { fontSize: 13, color: '#444', flexWrap: 'wrap' },
  messageButton: {
    backgroundColor: '#FFE0B2', borderRadius: 20, paddingVertical: 14, paddingHorizontal: 28,
    position: 'absolute', right: 20, bottom: 20, elevation: 4, shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.25, shadowRadius: 3.84,
  },
  messageButtonText: { color: '#222', fontWeight: 'bold', fontSize: 16 },
}); 