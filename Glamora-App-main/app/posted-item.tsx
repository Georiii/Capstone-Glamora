import React from 'react';
import { View, Text, Image, StyleSheet, TouchableOpacity } from 'react-native';
import { useLocalSearchParams, router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';

export default function PostedItem() {
  const params = useLocalSearchParams();
  const { imageUrl, name, description, price, userName, userEmail } = params;
  const imageSrc = Array.isArray(imageUrl) ? imageUrl[0] : imageUrl;

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
      {/* User Info and Message Button */}
      <View style={styles.userRow}>
        <View style={styles.userInfo}>
          <Image source={{ uri: 'https://randomuser.me/api/portraits/men/32.jpg' }} style={styles.userAvatar} />
          <View>
            <Text style={styles.userName}>Name</Text>
            <Text style={styles.userEmail}>Email</Text>
          </View>
        </View>
        <TouchableOpacity style={styles.messageButton} onPress={() => router.push({
          pathname: '/message-user',
          params: {
            sellerId: userName,
            sellerEmail: userEmail,
            productName: name,
            productImage: imageSrc
          }
        })}>
          <Text style={styles.messageButtonText}>Message User</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F9F3F0', padding: 20 },
  header: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    marginBottom: 10, marginTop: 10,
  },
  title: { fontSize: 28, fontWeight: 'bold', color: '#222' },
  image: {
    width: '100%', height: 250, borderRadius: 12, marginBottom: 18, marginTop: 10,
    borderWidth: 2, borderColor: '#222', backgroundColor: '#fff',
  },
  clothName: { fontSize: 24, fontWeight: 'bold', color: '#222', marginBottom: 6 },
  description: { fontSize: 16, color: '#222', marginBottom: 18 },
  priceRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 24 },
  priceLabel: { fontWeight: 'bold', fontSize: 20, marginRight: 10 },
  priceValue: { fontSize: 20, color: '#222', fontWeight: 'bold' },
  userRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: 30 },
  userInfo: { flexDirection: 'row', alignItems: 'center' },
  userAvatar: { width: 48, height: 48, borderRadius: 24, marginRight: 12 },
  userName: { fontWeight: 'bold', fontSize: 15, color: '#222' },
  userEmail: { fontSize: 13, color: '#888' },
  messageButton: {
    backgroundColor: '#FFE0B2', borderRadius: 12, paddingVertical: 12, paddingHorizontal: 24,
    alignSelf: 'flex-end',
  },
  messageButtonText: { color: '#222', fontWeight: 'bold', fontSize: 16 },
}); 