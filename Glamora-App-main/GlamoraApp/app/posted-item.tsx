import { Ionicons } from '@expo/vector-icons';
import { router, useLocalSearchParams } from 'expo-router';
import React from 'react';
import { Image, StyleSheet, Text, TouchableOpacity, View } from 'react-native';

export default function PostedItem() {
  const params = useLocalSearchParams();
  const { imageUrl, name, description, price, userName, userEmail, userProfilePicture } = params;
  const imageSrc = Array.isArray(imageUrl) ? imageUrl[0] : imageUrl;
  const sellerProfilePic = Array.isArray(userProfilePicture) ? userProfilePicture[0] : userProfilePicture;
  const defaultAvatar = require('../assets/avatar.png');

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()}>
          <Ionicons name="arrow-back" size={28} color="#000" />
        </TouchableOpacity>
        <Text style={styles.title}>MARKETPLACE</Text>
        <View style={{ width: 28 }} />
      </View>
      {/* Image */}
      <Image source={{ uri: imageSrc }} style={styles.image} />
      {/* Details */}
      <Text style={styles.clothName}>{name}</Text>
      <Text style={styles.description}>{description}</Text>
      <View style={styles.priceRow}>
        <Text style={styles.priceLabel}>Price</Text>
        <Text style={styles.priceValue}>₱{price}</Text>
      </View>
      {/* User Info */}
      <View style={styles.userInfoContainer}>
        <Image 
          source={sellerProfilePic ? { uri: sellerProfilePic } : defaultAvatar} 
          style={styles.userAvatar} 
        />
        <View style={styles.sellerTextContainer}>
          <Text style={styles.userName} numberOfLines={2}>
            {userName || 'Name'}
          </Text>
          <Text style={styles.userEmail} numberOfLines={2}>
            {userEmail || 'Email'}
          </Text>
        </View>
      </View>
      <TouchableOpacity style={styles.messageButton} onPress={() => router.push({
        pathname: '/message-user',
        params: {
          sellerId: userName,
          sellerEmail: userEmail,
          sellerProfilePicture: sellerProfilePic || defaultAvatar,
          productName: name,
          productImage: imageSrc
        }
      })}>
        <Text style={styles.messageButtonText}>Message User</Text>
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