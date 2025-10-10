import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useRouter } from 'expo-router';
import React, { useEffect, useState } from 'react';
import { Alert, Image, KeyboardAvoidingView, Modal, Platform, ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { API_ENDPOINTS } from '../config/api';

interface MarketplaceItem {
  _id: string;
  imageUrl: string;
  name: string;
  description: string;
  price: number;
}

export default function ManagePosts() {
  const router = useRouter();
  const [posts, setPosts] = useState<MarketplaceItem[]>([]);
  const [selectedPosts, setSelectedPosts] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [showEditModal, setShowEditModal] = useState(false);
  const [editingPost, setEditingPost] = useState<MarketplaceItem | null>(null);
  const [editName, setEditName] = useState('');
  const [editDescription, setEditDescription] = useState('');
  const [editPrice, setEditPrice] = useState('');
  const [editLoading, setEditLoading] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [deleteLoading, setDeleteLoading] = useState(false);

  useEffect(() => {
    loadUserPosts();
  }, []);

  const loadUserPosts = async () => {
    try {
      const token = await AsyncStorage.getItem('token');
      if (!token) {
        Alert.alert('Error', 'Please login to view your posts');
        return;
      }

      console.log('🔑 Token found, length:', token.length);
      console.log('🔑 Token preview:', token.substring(0, 20) + '...');

      const response = await fetch(API_ENDPOINTS.getUserMarketplaceItems, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      if (response.ok) {
        const data = await response.json();
        setPosts(data.items || []);
        console.log('✅ Posts loaded successfully:', data.items?.length || 0);
      } else {
        console.error('❌ Failed to load posts, status:', response.status);
        const errorText = await response.text();
        console.error('❌ Error response:', errorText);
      }
    } catch (error) {
      console.error('❌ Error loading posts:', error);
    } finally {
      setLoading(false);
    }
  };

  const togglePostSelection = (postId: string) => {
    setSelectedPosts(prev => 
      prev.includes(postId) 
        ? prev.filter(id => id !== postId)
        : [...prev, postId]
    );
  };

  const handleDeleteSelected = () => {
    if (selectedPosts.length === 0) {
      Alert.alert('Error', 'Please select posts to delete');
      return;
    }

    setShowDeleteModal(true);
  };

  const confirmDeleteSelected = async () => {
    if (selectedPosts.length === 0) return;
    
    try {
      console.log('🗑️ Starting delete process for selected posts...');
      setDeleteLoading(true);
      
      const token = await AsyncStorage.getItem('token');
      if (!token) {
        console.log('❌ No token found');
        Alert.alert('Error', 'Please login again');
        return;
      }

      // Delete selected posts
      for (const postId of selectedPosts) {
        console.log(`🗑️ Deleting post ${postId}...`);
        const response = await fetch(API_ENDPOINTS.deleteMarketplaceItem(postId), {
          method: 'DELETE',
          headers: {
            'Authorization': `Bearer ${token}`
          }
        });
        
        console.log(`📊 Delete response for ${postId}:`, response.status);
        if (!response.ok) {
          console.error(`❌ Failed to delete post ${postId}:`, response.status);
          const errorText = await response.text();
          console.error(`❌ Error response:`, errorText);
        } else {
          console.log(`✅ Successfully deleted post ${postId}`);
        }
      }

      // Refresh posts
      await loadUserPosts();
      setSelectedPosts([]);
      setShowDeleteModal(false);
      Alert.alert('Success', 'Selected posts deleted successfully');
    } catch (error: any) {
      console.error('❌ Error deleting posts:', error);
      Alert.alert('Error', 'Failed to delete posts');
    } finally {
      setDeleteLoading(false);
    }
  };

  const closeDeleteModal = () => {
    setShowDeleteModal(false);
  };

  const handleEditSelected = () => {
    if (selectedPosts.length === 0) {
      Alert.alert('Error', 'Please select a post to edit');
      return;
    }

    if (selectedPosts.length > 1) {
      Alert.alert('Warning', 'You can only edit one post at a time.');
      return;
    }

    const postToEdit = posts.find(post => post._id === selectedPosts[0]);
    if (postToEdit) {
      setEditingPost(postToEdit);
      setEditName(postToEdit.name);
      setEditDescription(postToEdit.description);
      setEditPrice(postToEdit.price.toString());
      setShowEditModal(true);
    }
  };

  const handleSaveEdit = async () => {
    if (!editingPost || !editName.trim() || !editPrice.trim()) {
      Alert.alert('Error', 'Please fill in name and price');
      return;
    }

    const price = parseFloat(editPrice);
    if (isNaN(price) || price <= 0) {
      Alert.alert('Error', 'Please enter a valid price');
      return;
    }

    setEditLoading(true);
    try {
      const token = await AsyncStorage.getItem('token');
      if (!token) {
        Alert.alert('Error', 'Please login again');
        return;
      }

      const response = await fetch(API_ENDPOINTS.updateMarketplaceItem(editingPost._id), {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          name: editName.trim(),
          description: editDescription.trim(),
          price: price
        })
      });

      if (response.ok) {
        // Update the post in the local state
        setPosts(prev => prev.map(post => 
          post._id === editingPost._id 
            ? { ...post, name: editName.trim(), description: editDescription.trim(), price }
            : post
        ));
        
        setShowEditModal(false);
        setEditingPost(null);
        setEditName('');
        setEditDescription('');
        setEditPrice('');
        setSelectedPosts([]); // Clear selection after editing
        Alert.alert('Success', 'Post updated successfully');
      } else {
        const errorData = await response.json();
        Alert.alert('Error', errorData.message || 'Failed to update post');
      }
    } catch (error) {
      console.error('Error updating post:', error);
      Alert.alert('Error', 'Failed to update post');
    } finally {
      setEditLoading(false);
    }
  };

  const closeEditModal = () => {
    setShowEditModal(false);
    setEditingPost(null);
    setEditName('');
    setEditDescription('');
    setEditPrice('');
  };



  if (loading) {
    return (
      <View style={styles.container}>
        <View style={styles.header}>
          <TouchableOpacity style={styles.backButton} onPress={() => router.back()}>
            <Ionicons name="arrow-back" size={24} color="#000" />
          </TouchableOpacity>
          <Text style={styles.pageTitle}>Posts activities</Text>
          <View style={styles.placeholder} />
        </View>
        <View style={styles.loadingContainer}>
          <Text style={styles.loadingText}>Loading posts...</Text>
        </View>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity style={styles.backButton} onPress={() => router.back()}>
          <Ionicons name="arrow-back" size={24} color="#000" />
        </TouchableOpacity>
        <View style={styles.headerCenter}>
          <View style={styles.gCircle}>
            <Text style={styles.gText}>G</Text>
          </View>
          <Text style={styles.headerText}>GLAMORA</Text>
        </View>
        <View style={styles.placeholder} />
      </View>

      {/* Title */}
      <Text style={styles.pageTitle}>Posts activities</Text>
      


      {/* Posts List */}
      <ScrollView style={styles.postsContainer} showsVerticalScrollIndicator={false}>
        {posts.map((post) => (
          <View key={post._id} style={styles.postItem}>
            <TouchableOpacity 
              style={styles.checkbox}
              onPress={() => togglePostSelection(post._id)}
            >
              <Ionicons 
                name={selectedPosts.includes(post._id) ? "checkbox" : "square-outline"} 
                size={24} 
                color={selectedPosts.includes(post._id) ? "#007AFF" : "#666"} 
              />
            </TouchableOpacity>
            
            <Image source={{ uri: post.imageUrl }} style={styles.postImage} />
            
            <View style={styles.postDetails}>
              <Text style={styles.postName}>{post.name}</Text>
              <Text style={styles.postDescription}>{post.description}</Text>
              <Text style={styles.postPrice}>₱{post.price}</Text>
            </View>
          </View>
        ))}
      </ScrollView>

      {/* Action Buttons */}
      {selectedPosts.length > 0 && (
        <View style={styles.actionButtons}>
          <View style={styles.actionButtonsRow}>
            <TouchableOpacity 
              style={styles.editButton}
              onPress={handleEditSelected}
            >
              <Ionicons name="create-outline" size={20} color="#fff" />
              <Text style={styles.editButtonText}>Edit</Text>
            </TouchableOpacity>
            
            <TouchableOpacity 
              style={styles.deleteButton}
              onPress={handleDeleteSelected}
            >
              <Ionicons name="trash-outline" size={20} color="#fff" />
              <Text style={styles.deleteButtonText}>
                Delete ({selectedPosts.length})
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      )}

      {/* Add More Button */}
      <TouchableOpacity 
        style={styles.addMoreButton}
        onPress={() => router.push('/scan')}
      >
        <Ionicons name="add" size={30} color="#000" />
        <Text style={styles.addMoreText}>Add more</Text>
      </TouchableOpacity>

      {/* Edit Modal */}
      <Modal
        visible={showEditModal}
        transparent
        animationType="fade"
        onRequestClose={closeEditModal}
      >
        <KeyboardAvoidingView style={styles.modalOverlay} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
          <View style={styles.editModalContent}>
            <TouchableOpacity style={styles.closeButton} onPress={closeEditModal}>
              <Ionicons name="close" size={24} color="#333" />
            </TouchableOpacity>
            <Text style={styles.editModalTitle}>Edit Post</Text>
            
            <TextInput
              style={styles.editInput}
              placeholder="Name"
              value={editName}
              onChangeText={setEditName}
              placeholderTextColor="#999"
            />
            
            <TextInput
              style={styles.editTextarea}
              placeholder="Description"
              value={editDescription}
              onChangeText={setEditDescription}
              placeholderTextColor="#999"
              multiline
              numberOfLines={3}
            />
            
            <TextInput
              style={styles.editInput}
              placeholder="Price"
              value={editPrice}
              onChangeText={setEditPrice}
              placeholderTextColor="#999"
              keyboardType="numeric"
            />
            
            <TouchableOpacity 
              style={styles.editSaveButton} 
              onPress={handleSaveEdit}
              disabled={editLoading}
            >
              {editLoading ? (
                <Text style={styles.editSaveButtonText}>Saving...</Text>
              ) : (
                <Text style={styles.editSaveButtonText}>Save Changes</Text>
              )}
            </TouchableOpacity>
          </View>
        </KeyboardAvoidingView>
      </Modal>

      {/* Delete Confirmation Modal */}
      <Modal
        visible={showDeleteModal}
        transparent
        animationType="fade"
        onRequestClose={closeDeleteModal}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.deleteModalContent}>
            <Text style={styles.deleteModalTitle}>Delete Posts</Text>
            <Text style={styles.deleteModalText}>
              Are you sure you want to delete {selectedPosts.length} selected post(s)?
            </Text>
            <Text style={styles.deleteModalSubtext}>
              This action cannot be undone.
            </Text>
            
            <View style={styles.deleteModalButtons}>
              <TouchableOpacity 
                style={styles.deleteCancelButton}
                onPress={closeDeleteModal}
              >
                <Text style={styles.deleteCancelButtonText}>Cancel</Text>
              </TouchableOpacity>
              
              <TouchableOpacity 
                style={styles.deleteConfirmButton}
                onPress={confirmDeleteSelected}
                disabled={deleteLoading}
              >
                {deleteLoading ? (
                  <Text style={styles.deleteConfirmButtonText}>Deleting...</Text>
                ) : (
                  <Text style={styles.deleteConfirmButtonText}>Delete</Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
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
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingTop: 40,
    paddingBottom: 20,
  },
  backButton: {
    padding: 10,
  },
  headerCenter: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    justifyContent: 'center',
  },
  gCircle: {
    width: 40,
    height: 40,
    borderRadius: 20,
    borderWidth: 2,
    borderColor: '#4B2E2B',
    backgroundColor: '#fff',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 10,
  },
  gText: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#4B2E2B',
    fontFamily: 'serif',
  },
  headerText: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#4B2E2B',
    fontFamily: 'serif',
    letterSpacing: 1,
  },
  placeholder: {
    width: 40,
  },
  pageTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#333',
    textAlign: 'center',
    marginBottom: 20,
  },
  postsContainer: {
    flex: 1,
    paddingHorizontal: 20,
  },
  postItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 15,
    marginBottom: 15,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  checkbox: {
    marginRight: 15,
  },
  postImage: {
    width: 80,
    height: 80,
    borderRadius: 8,
    marginRight: 15,
  },
  postDetails: {
    flex: 1,
  },
  postName: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 5,
  },
  postDescription: {
    fontSize: 14,
    color: '#666',
    marginBottom: 5,
  },
  postPrice: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#007AFF',
  },
  actionButtons: {
    paddingHorizontal: 20,
    paddingVertical: 15,
    backgroundColor: '#F4C2C2',
  },
  actionButtonsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 15,
  },
  editButton: {
    flex: 1,
    backgroundColor: '#007AFF',
    borderRadius: 8,
    paddingVertical: 12,
    paddingHorizontal: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  editButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  deleteButton: {
    flex: 1,
    backgroundColor: '#FF3B30',
    borderRadius: 8,
    paddingVertical: 12,
    paddingHorizontal: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  deleteButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  addMoreButton: {
    position: 'absolute',
    bottom: 30,
    right: 30,
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: '#fff',
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
    elevation: 5,
  },
  addMoreText: {
    fontSize: 12,
    color: '#333',
    marginTop: 5,
    textAlign: 'center',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    fontSize: 16,
    color: '#666',
  },
  // Edit Modal Styles
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.4)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  editModalContent: {
    backgroundColor: 'white',
    borderRadius: 15,
    padding: 25,
    width: '85%',
    maxWidth: 350,
    position: 'relative',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 10,
    elevation: 8,
  },
  closeButton: {
    position: 'absolute',
    top: 15,
    right: 15,
    padding: 5,
    zIndex: 1,
  },
  editModalTitle: {
    fontSize: 20,
    fontWeight: '600',
    textAlign: 'center',
    marginBottom: 25,
    color: '#333',
    marginTop: 10,
  },
  editInput: {
    borderWidth: 1,
    borderColor: '#E0E0E0',
    borderRadius: 8,
    padding: 12,
    marginBottom: 16,
    fontSize: 15,
    backgroundColor: '#F8F8F8',
    color: '#333',
  },
  editTextarea: {
    borderWidth: 1,
    borderColor: '#E0E0E0',
    borderRadius: 8,
    padding: 12,
    marginBottom: 16,
    fontSize: 15,
    backgroundColor: '#F8F8F8',
    height: 80,
    textAlignVertical: 'top',
    color: '#333',
  },
  editSaveButton: {
    backgroundColor: '#007AFF',
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 20,
    alignItems: 'center',
    marginTop: 8,
    alignSelf: 'flex-end',
    borderWidth: 1,
    borderColor: '#0056CC',
  },
  editSaveButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },

  // Delete Modal Styles
  deleteModalContent: {
    backgroundColor: 'white',
    borderRadius: 15,
    padding: 25,
    width: '85%',
    maxWidth: 350,
    position: 'relative',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 10,
    elevation: 8,
  },
  deleteModalTitle: {
    fontSize: 20,
    fontWeight: '600',
    textAlign: 'center',
    marginBottom: 15,
    color: '#FF3B30',
  },
  deleteModalText: {
    fontSize: 16,
    textAlign: 'center',
    marginBottom: 8,
    color: '#333',
  },
  deleteModalSubtext: {
    fontSize: 14,
    textAlign: 'center',
    marginBottom: 25,
    color: '#666',
    fontStyle: 'italic',
  },
  deleteModalButtons: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 15,
  },
  deleteCancelButton: {
    flex: 1,
    backgroundColor: '#E0E0E0',
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderRadius: 20,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#CCC',
  },
  deleteCancelButtonText: {
    color: '#333',
    fontSize: 16,
    fontWeight: '600',
  },
  deleteConfirmButton: {
    flex: 1,
    backgroundColor: '#FF3B30',
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderRadius: 20,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#E74C3C',
  },
  deleteConfirmButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
});
