import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useRouter } from 'expo-router';
import React, { useCallback, useEffect, useState } from 'react';
import { Alert, Image, KeyboardAvoidingView, Modal, Platform, ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { API_ENDPOINTS } from '../config/api';
import { useSocket } from './contexts/SocketContext';
import { useTheme } from './contexts/ThemeContext';

interface MarketplaceItem {
  _id: string;
  imageUrl: string;
  name: string;
  description: string;
  price: number;
  status?: 'Pending' | 'Approved' | 'Rejected';
  color?: string;
  gender?: string;
  sizes?: {
    tops: string[];
    bottoms: string[];
    shoes: string[];
  };
  isAccessories?: boolean;
}

export default function ManagePosts() {
  const router = useRouter();
  const { theme } = useTheme();
  const { socket } = useSocket();
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
  // New fields for redesigned edit UI
  const [editColor, setEditColor] = useState<string>('');
  const [editGender, setEditGender] = useState<string>('');
  const [editSizes, setEditSizes] = useState<{
    tops: string[];
    bottoms: string[];
    shoes: string[];
  }>({ tops: [], bottoms: [], shoes: [] });
  const [editIsAccessories, setEditIsAccessories] = useState(false);
  const [showEditSizeChart, setShowEditSizeChart] = useState(false);
  const [currentEditSizeChart, setCurrentEditSizeChart] = useState<'tops' | 'bottoms-shorts' | 'shoes' | null>(null);
  const [expandedSizeCategories, setExpandedSizeCategories] = useState<{
    tops: boolean;
    bottoms: boolean;
    shoes: boolean;
  }>({ tops: false, bottoms: false, shoes: false });
  
  const marketplaceColorOptions = ['BLACK', 'WHITE', 'BLUE', 'RED', 'GREEN', 'YELLOW', 'PINK', 'PURPLE', 'BROWN', 'GRAY', 'MAROON', 'KHAKI', 'ORANGE'];
  const genderOptions = ['MAN', 'WOMAN', 'UNISEX'];
  const sizeOptions = {
    tops: ['XS', 'S', 'M', 'L', 'XL', 'XXL'],
    bottoms: ['XS', 'S', 'M', 'L', 'XL', 'XXL'],
    shoes: ['35', '36', '37', '38', '39', '40', '41', '42', '43', '44', '45']
  };

  const loadUserPosts = useCallback(async () => {
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
        const approvedItems = (data.items || []).filter((item: MarketplaceItem & { status?: string }) => item.status === 'Approved');
        setPosts(approvedItems);
        console.log('✅ Approved posts loaded successfully:', approvedItems.length);
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
  }, []);

  useEffect(() => {
    loadUserPosts();
  }, [loadUserPosts]);

  useEffect(() => {
    if (!socket) return;
    const handler = () => {
      loadUserPosts();
    };
    socket.on('marketplace:item:approved', handler);
    socket.on('marketplace:item:rejected', handler);
    socket.on('system:account-notice', handler);
    return () => {
      socket.off('marketplace:item:approved', handler);
      socket.off('marketplace:item:rejected', handler);
      socket.off('system:account-notice', handler);
    };
  }, [socket, loadUserPosts]);

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
      setEditDescription(postToEdit.description || '');
      setEditPrice(postToEdit.price.toString());
      setEditColor(postToEdit.color || '');
      setEditGender(postToEdit.gender || '');
      const existingSizes = postToEdit.sizes || { tops: [], bottoms: [], shoes: [] };
      setEditSizes(existingSizes);
      setEditIsAccessories(postToEdit.isAccessories || false);
      // Set expanded state based on whether sizes exist
      setExpandedSizeCategories({
        tops: existingSizes.tops.length > 0,
        bottoms: existingSizes.bottoms.length > 0,
        shoes: existingSizes.shoes.length > 0
      });
      setShowEditModal(true);
    }
  };

  const handleEditColorSelect = (color: string): void => {
    if (editColor === color) {
      setEditColor('');
    } else {
      setEditColor(color);
    }
  };

  const handleEditGenderSelect = (gender: string): void => {
    if (editGender === gender) {
      setEditGender('');
    } else {
      setEditGender(gender);
    }
  };

  const handleEditSizeToggle = (category: 'tops' | 'bottoms' | 'shoes', size: string): void => {
    setEditSizes(prev => {
      const categorySizes = prev[category];
      if (categorySizes.includes(size)) {
        return {
          ...prev,
          [category]: categorySizes.filter(s => s !== size)
        };
      } else {
        return {
          ...prev,
          [category]: [...categorySizes, size]
        };
      }
    });
  };

  const handleEditSizeCategoryToggle = (category: 'tops' | 'bottoms' | 'shoes'): void => {
    // Toggle expanded state (show/hide options)
    setExpandedSizeCategories(prev => ({
      ...prev,
      [category]: !prev[category]
    }));
    
    // If unchecking and sizes are selected, clear them
    if (expandedSizeCategories[category] && editSizes[category].length > 0) {
      setEditSizes(prev => ({
        ...prev,
        [category]: []
      }));
    }
    // When checking, just show options (don't auto-select sizes)
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

    // Validate new required fields
    if (!editColor) {
      Alert.alert('Error', 'Please select a product color');
      return;
    }
    if (!editGender) {
      Alert.alert('Error', 'Please select a gender');
      return;
    }
    // Check if at least one size category is selected (unless it's accessories)
    if (!editIsAccessories && editSizes.tops.length === 0 && editSizes.bottoms.length === 0 && editSizes.shoes.length === 0) {
      Alert.alert('Error', 'Please select at least one size category or mark as accessories');
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
          price: price,
          color: editColor,
          gender: editGender,
          sizes: editSizes,
          isAccessories: editIsAccessories
        })
      });

      if (response.ok) {
        // Update the post in the local state
        setPosts(prev => prev.map(post => 
          post._id === editingPost._id 
            ? { 
                ...post, 
                name: editName.trim(), 
                description: editDescription.trim(), 
                price,
                color: editColor,
                gender: editGender,
                sizes: editSizes,
                isAccessories: editIsAccessories
              }
            : post
        ));
        
        setShowEditModal(false);
        setEditingPost(null);
        setEditName('');
        setEditDescription('');
        setEditPrice('');
        setEditColor('');
        setEditGender('');
        setEditSizes({ tops: [], bottoms: [], shoes: [] });
        setEditIsAccessories(false);
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
    setEditColor('');
    setEditGender('');
    setEditSizes({ tops: [], bottoms: [], shoes: [] });
    setEditIsAccessories(false);
    setExpandedSizeCategories({ tops: false, bottoms: false, shoes: false });
    setShowEditSizeChart(false);
    setCurrentEditSizeChart(null);
  };



  if (loading) {
    return (
      <View style={[styles.container, { backgroundColor: theme.colors.bodyBackground }]}>
        <View style={[styles.header, { backgroundColor: theme.colors.headerBackground }]}>
          <TouchableOpacity style={styles.backButton} onPress={() => router.back()}>
            <Ionicons name="arrow-back" size={24} color={theme.colors.icon} />
          </TouchableOpacity>
          <Text style={[styles.pageTitle, { color: theme.colors.headerText }]}>Posts activities</Text>
          <View style={styles.placeholder} />
        </View>
        <View style={styles.loadingContainer}>
          <Text style={[styles.loadingText, { color: theme.colors.primaryText }]}>Loading posts...</Text>
        </View>
      </View>
    );
  }

  return (
    <View style={[styles.container, { backgroundColor: theme.colors.bodyBackground }]}>
      {/* Header */}
      <View style={[styles.header, { backgroundColor: theme.colors.headerBackground }]}>
        <TouchableOpacity style={styles.backButton} onPress={() => router.back()}>
          <Ionicons name="arrow-back" size={24} color={theme.colors.icon} />
        </TouchableOpacity>
        <View style={styles.headerCenter}>
          <View style={[styles.gCircle, { backgroundColor: theme.colors.accent }]}>
            <Text style={[styles.gText, { color: theme.colors.buttonText }]}>G</Text>
          </View>
          <Text style={[styles.headerText, { color: theme.colors.headerText }]}>GLAMORA</Text>
        </View>
        <View style={styles.placeholder} />
      </View>

      {/* Title */}
      <Text style={[styles.pageTitle, { color: theme.colors.primaryText }]}>Posts activities</Text>
      


      {/* Posts List */}
      <ScrollView style={styles.postsContainer} showsVerticalScrollIndicator={false}>
        {posts.map((post) => (
          <View key={post._id} style={[styles.postItem, { backgroundColor: theme.colors.containerBackground, borderColor: theme.colors.border }]}>
            <TouchableOpacity 
              style={styles.postCheckbox}
              onPress={() => togglePostSelection(post._id)}
            >
              <Ionicons 
                name={selectedPosts.includes(post._id) ? "checkbox" : "square-outline"} 
                size={24} 
                color={selectedPosts.includes(post._id) ? theme.colors.accent : theme.colors.secondaryText} 
              />
            </TouchableOpacity>
            
            <Image source={{ uri: post.imageUrl }} style={styles.postImage} />
            
            <View style={styles.postDetails}>
              <Text style={[styles.postName, { color: theme.colors.primaryText }]}>{post.name}</Text>
              <Text style={[styles.postDescription, { color: theme.colors.secondaryText }]}>{post.description}</Text>
              <Text style={[styles.postPrice, { color: theme.colors.primaryText }]}>₱{post.price}</Text>
            </View>
          </View>
        ))}
      </ScrollView>

      {/* Action Buttons */}
      {selectedPosts.length > 0 && (
        <View style={styles.actionButtons}>
          <View style={styles.actionButtonsRow}>
            <TouchableOpacity 
              style={[styles.editButton, { backgroundColor: theme.colors.buttonBackground }]}
              onPress={handleEditSelected}
            >
              <Ionicons name="create-outline" size={20} color={theme.colors.buttonText} />
              <Text style={[styles.editButtonText, { color: theme.colors.buttonText }]}>Edit</Text>
            </TouchableOpacity>
            
            <TouchableOpacity 
              style={[styles.deleteButton, { backgroundColor: theme.colors.accent }]}
              onPress={handleDeleteSelected}
            >
              <Ionicons name="trash-outline" size={20} color={theme.colors.buttonText} />
              <Text style={[styles.deleteButtonText, { color: theme.colors.buttonText }]}>
                Delete ({selectedPosts.length})
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      )}

      {/* Add More Button */}
      <TouchableOpacity 
        style={[styles.addMoreButton, { backgroundColor: theme.colors.buttonSecondary }]}
        onPress={() => router.push('/scan')}
      >
        <Ionicons name="add" size={30} color={theme.colors.icon} />
        <Text style={[styles.addMoreText, { color: theme.colors.primaryText }]}>Add more</Text>
      </TouchableOpacity>

      {/* Edit Modal - Redesigned to match Posting Details */}
      <Modal
        visible={showEditModal}
        transparent
        animationType="slide"
        onRequestClose={closeEditModal}
      >
        <View style={[styles.modalOverlay, { backgroundColor: 'rgba(0,0,0,0.4)' }]}>
          <KeyboardAvoidingView 
            style={{ flex: 1 }} 
            behavior={Platform.OS === 'ios' ? 'padding' : undefined}
          >
            <ScrollView 
              style={styles.marketplaceModalScroll}
              contentContainerStyle={styles.marketplaceModalScrollContent}
              showsVerticalScrollIndicator={true}
            >
              <View style={[styles.marketplaceModalContent, { backgroundColor: theme.colors.containerBackground }]}>
                {/* Header */}
                <View style={styles.postingDetailsHeader}>
                  <TouchableOpacity onPress={closeEditModal}>
                    <Ionicons name="arrow-back" size={24} color={theme.colors.icon} />
            </TouchableOpacity>
                  <Text style={[styles.postingDetailsTitle, { color: theme.colors.primaryText }]}>EDIT POST</Text>
                  <View style={{ width: 24 }} />
                </View>
            
                {/* Name Field */}
                <View style={styles.postingField}>
                  <Text style={[styles.postingLabel, { color: theme.colors.primaryText }]}>
                    Name<Text style={{ color: 'red' }}>*</Text>
                  </Text>
            <TextInput
                    style={[styles.postingInput, { backgroundColor: theme.colors.containerBackground, color: theme.colors.primaryText, borderColor: theme.colors.border }]}
              value={editName}
              onChangeText={setEditName}
                    placeholder="Enter item name"
                    placeholderTextColor={theme.colors.secondaryText}
            />
                </View>
            
                {/* Description Field */}
                <View style={styles.postingField}>
                  <Text style={[styles.postingLabel, { color: theme.colors.primaryText }]}>
                    Description<Text style={{ color: 'red' }}>*</Text>
                  </Text>
            <TextInput
                    style={[styles.postingTextarea, { backgroundColor: theme.colors.containerBackground, color: theme.colors.primaryText, borderColor: theme.colors.border }]}
              value={editDescription}
              onChangeText={setEditDescription}
                    placeholder="Enter description"
                    placeholderTextColor={theme.colors.secondaryText}
              multiline
                    numberOfLines={4}
            />
                </View>
            
                {/* Price Field */}
                <View style={styles.postingField}>
                  <Text style={[styles.postingLabel, { color: theme.colors.primaryText }]}>
                    Price<Text style={{ color: 'red' }}>*</Text>
                  </Text>
            <TextInput
                    style={[styles.postingInput, { backgroundColor: theme.colors.containerBackground, color: theme.colors.primaryText, borderColor: theme.colors.border }]}
              value={editPrice}
              onChangeText={setEditPrice}
                    placeholder="Enter price"
                    placeholderTextColor={theme.colors.secondaryText}
              keyboardType="numeric"
            />
                </View>

                {/* PRODUCT COLOR Section */}
                <View style={styles.postingSection}>
                  <Text style={[styles.postingSectionTitle, { color: theme.colors.primaryText }]}>
                    PRODUCT COLOR<Text style={{ color: 'red' }}>*</Text>
                  </Text>
                  <View style={styles.colorGrid}>
                    {marketplaceColorOptions.map((color) => (
            <TouchableOpacity 
                        key={color}
                        style={[
                          styles.colorButton,
                          { backgroundColor: theme.colors.containerBackground, borderColor: theme.colors.border },
                          editColor === color && [styles.colorButtonSelected, { backgroundColor: theme.colors.accent, borderColor: theme.colors.accent }]
                        ]}
                        onPress={() => handleEditColorSelect(color)}
                      >
                        <Text style={[
                          styles.colorButtonText,
                          { color: theme.colors.secondaryText },
                          editColor === color && { color: theme.colors.buttonText }
                        ]}>
                          {color}
                        </Text>
                      </TouchableOpacity>
                    ))}
                  </View>
                </View>

                {/* GENDER Section */}
                <View style={styles.postingSection}>
                  <Text style={[styles.postingSectionTitle, { color: theme.colors.primaryText }]}>
                    GENDER<Text style={{ color: 'red' }}>*</Text>
                  </Text>
                  <View style={styles.genderContainer}>
                    {genderOptions.map((gender) => (
                      <TouchableOpacity
                        key={gender}
                        style={[
                          styles.genderButton,
                          { backgroundColor: theme.colors.containerBackground, borderColor: theme.colors.border },
                          editGender === gender && [styles.genderButtonSelected, { backgroundColor: theme.colors.accent, borderColor: theme.colors.accent }]
                        ]}
                        onPress={() => handleEditGenderSelect(gender)}
                      >
                        <Text style={[
                          styles.genderButtonText,
                          { color: theme.colors.secondaryText },
                          editGender === gender && { color: theme.colors.buttonText }
                        ]}>
                          {gender}
                        </Text>
                      </TouchableOpacity>
                    ))}
                  </View>
                </View>

                {/* PRODUCT SIZE Section */}
                <View style={styles.postingSection}>
                  <Text style={[styles.postingSectionTitle, { color: theme.colors.primaryText }]}>
                    PRODUCT SIZE<Text style={{ color: 'red' }}>*</Text>
                  </Text>
                  
                  {/* TOP */}
                  <View style={styles.sizeCategoryRow}>
                    <View style={styles.sizeCategoryHeader}>
                      <TouchableOpacity
                        style={[styles.checkbox, { borderColor: theme.colors.border }]}
                        onPress={() => handleEditSizeCategoryToggle('tops')}
                      >
                        {expandedSizeCategories.tops && (
                          <Ionicons name="checkmark" size={16} color={theme.colors.accent} />
                        )}
                      </TouchableOpacity>
                      <Text style={[styles.sizeCategoryLabel, { color: theme.colors.primaryText }]}>TOP</Text>
                      <TouchableOpacity
                        onPress={() => {
                          setCurrentEditSizeChart('tops');
                          setShowEditSizeChart(true);
                        }}
                        style={styles.sizeChartIcon}
                      >
                        <Ionicons name="help-circle-outline" size={20} color={theme.colors.accent} />
                      </TouchableOpacity>
                    </View>
                    {expandedSizeCategories.tops && (
                      <View style={styles.sizeOptionsContainer}>
                        {sizeOptions.tops.map((size) => (
                          <TouchableOpacity
                            key={`tops-${size}`}
                            style={[
                              styles.sizeOptionButton,
                              { backgroundColor: theme.colors.containerBackground, borderColor: theme.colors.border },
                              editSizes.tops.includes(size) && [styles.sizeOptionButtonSelected, { backgroundColor: theme.colors.accent, borderColor: theme.colors.accent }]
                            ]}
                            onPress={() => handleEditSizeToggle('tops', size)}
                          >
                            <Text style={[
                              styles.sizeOptionText,
                              { color: theme.colors.secondaryText },
                              editSizes.tops.includes(size) && { color: theme.colors.buttonText }
                            ]}>
                              {size}
                            </Text>
                          </TouchableOpacity>
                        ))}
                      </View>
                    )}
                  </View>

                  {/* BOTTOM */}
                  <View style={styles.sizeCategoryRow}>
                    <View style={styles.sizeCategoryHeader}>
                      <TouchableOpacity
                        style={[styles.checkbox, { borderColor: theme.colors.border }]}
                        onPress={() => handleEditSizeCategoryToggle('bottoms')}
                      >
                        {expandedSizeCategories.bottoms && (
                          <Ionicons name="checkmark" size={16} color={theme.colors.accent} />
                        )}
                      </TouchableOpacity>
                      <Text style={[styles.sizeCategoryLabel, { color: theme.colors.primaryText }]}>BOTTOM</Text>
                      <TouchableOpacity
                        onPress={() => {
                          setCurrentEditSizeChart('bottoms-shorts');
                          setShowEditSizeChart(true);
                        }}
                        style={styles.sizeChartIcon}
                      >
                        <Ionicons name="help-circle-outline" size={20} color={theme.colors.accent} />
                      </TouchableOpacity>
                    </View>
                    {expandedSizeCategories.bottoms && (
                      <View style={styles.sizeOptionsContainer}>
                        {sizeOptions.bottoms.map((size) => (
                          <TouchableOpacity
                            key={`bottoms-${size}`}
                            style={[
                              styles.sizeOptionButton,
                              { backgroundColor: theme.colors.containerBackground, borderColor: theme.colors.border },
                              editSizes.bottoms.includes(size) && [styles.sizeOptionButtonSelected, { backgroundColor: theme.colors.accent, borderColor: theme.colors.accent }]
                            ]}
                            onPress={() => handleEditSizeToggle('bottoms', size)}
                          >
                            <Text style={[
                              styles.sizeOptionText,
                              { color: theme.colors.secondaryText },
                              editSizes.bottoms.includes(size) && { color: theme.colors.buttonText }
                            ]}>
                              {size}
                            </Text>
                          </TouchableOpacity>
                        ))}
                      </View>
                    )}
                  </View>

                  {/* SHOE */}
                  <View style={styles.sizeCategoryRow}>
                    <View style={styles.sizeCategoryHeader}>
                      <TouchableOpacity
                        style={[styles.checkbox, { borderColor: theme.colors.border }]}
                        onPress={() => handleEditSizeCategoryToggle('shoes')}
                      >
                        {expandedSizeCategories.shoes && (
                          <Ionicons name="checkmark" size={16} color={theme.colors.accent} />
                        )}
                      </TouchableOpacity>
                      <Text style={[styles.sizeCategoryLabel, { color: theme.colors.primaryText }]}>SHOE</Text>
                      <TouchableOpacity
                        onPress={() => {
                          setCurrentEditSizeChart('shoes');
                          setShowEditSizeChart(true);
                        }}
                        style={styles.sizeChartIcon}
                      >
                        <Ionicons name="help-circle-outline" size={20} color={theme.colors.accent} />
                      </TouchableOpacity>
                    </View>
                    {expandedSizeCategories.shoes && (
                      <View style={styles.sizeOptionsContainer}>
                        {sizeOptions.shoes.map((size) => (
                          <TouchableOpacity
                            key={`shoes-${size}`}
                            style={[
                              styles.sizeOptionButton,
                              { backgroundColor: theme.colors.containerBackground, borderColor: theme.colors.border },
                              editSizes.shoes.includes(size) && [styles.sizeOptionButtonSelected, { backgroundColor: theme.colors.accent, borderColor: theme.colors.accent }]
                            ]}
                            onPress={() => handleEditSizeToggle('shoes', size)}
                          >
                            <Text style={[
                              styles.sizeOptionText,
                              { color: theme.colors.secondaryText },
                              editSizes.shoes.includes(size) && { color: theme.colors.buttonText }
                            ]}>
                              {size}
                            </Text>
                          </TouchableOpacity>
                        ))}
                      </View>
                    )}
                  </View>
                </View>

                {/* ACCESSORIES */}
                <View style={styles.postingSection}>
                  <View style={styles.accessoriesRow}>
                    <TouchableOpacity
                      style={[styles.checkbox, { borderColor: theme.colors.border }]}
                      onPress={() => setEditIsAccessories(!editIsAccessories)}
                    >
                      {editIsAccessories && (
                        <Ionicons name="checkmark" size={16} color={theme.colors.accent} />
                      )}
                    </TouchableOpacity>
                    <Text style={[styles.accessoriesLabel, { color: theme.colors.primaryText }]}>ACCESSORIES</Text>
                  </View>
                  <Text style={[styles.accessoriesNote, { color: theme.colors.secondaryText }]}>
                    Accessories do not have a single, required standard size.
                  </Text>
                </View>

                {/* Required Note */}
                <Text style={[styles.requiredNote, { color: 'red' }]}>
                  * required and must fulfill
                </Text>

                {/* SAVE Button */}
                <TouchableOpacity 
                  style={[styles.postButton, { backgroundColor: theme.colors.accent }]} 
              onPress={handleSaveEdit}
              disabled={editLoading}
            >
              {editLoading ? (
                    <Text style={[styles.postButtonText, { color: theme.colors.buttonText }]}>SAVING...</Text>
              ) : (
                    <Text style={[styles.postButtonText, { color: theme.colors.buttonText }]}>SAVE CHANGES</Text>
              )}
            </TouchableOpacity>
          </View>
            </ScrollView>
        </KeyboardAvoidingView>
        </View>

        {/* Size Chart Modal */}
        <Modal visible={showEditSizeChart} transparent animationType="fade">
          <View style={styles.chartModalOverlay}>
            <View style={[styles.chartModalContent, { backgroundColor: theme.colors.containerBackground }]}>
              <TouchableOpacity
                style={styles.chartCloseButton}
                onPress={() => {
                  setShowEditSizeChart(false);
                  setCurrentEditSizeChart(null);
                }}
              >
                <Ionicons name="close" size={24} color={theme.colors.icon} />
              </TouchableOpacity>
              
              {currentEditSizeChart === 'bottoms-shorts' ? (
                <View style={styles.chartModalImageContainer}>
                  <Image
                    source={require('../assets/pants-chart.png')}
                    style={styles.chartImage}
                    resizeMode="contain"
                  />
                </View>
              ) : (
                <View style={styles.chartModalImageContainer}>
                  {currentEditSizeChart === 'tops' && (
                    <Image
                      source={require('../assets/tops-chart.png')}
                      style={styles.chartImage}
                      resizeMode="contain"
                    />
                  )}
                  
                  {currentEditSizeChart === 'shoes' && (
                    <Image
                      source={require('../assets/shoes-chart.png')}
                      style={styles.chartImage}
                      resizeMode="contain"
                    />
                  )}
                </View>
              )}
            </View>
          </View>
        </Modal>
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
    width: 24,
    height: 24,
    borderWidth: 2,
    borderRadius: 4,
    marginRight: 8,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'transparent',
  },
  postCheckbox: {
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
    bottom: 80,
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
  // New Edit Modal Styles (matching Posting Details)
  // New Edit Modal Styles (matching Posting Details exactly)
  marketplaceModalScroll: {
    flex: 1,
  },
  marketplaceModalScrollContent: {
    paddingVertical: 20,
    paddingHorizontal: 10,
  },
  marketplaceModalContent: {
    borderRadius: 20,
    padding: 20,
    width: '100%',
    maxWidth: 500,
    alignSelf: 'center',
    marginHorizontal: Platform.OS === 'web' ? 0 : 10,
  },
  postingDetailsHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 24,
    paddingHorizontal: 4,
  },
  postingDetailsTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    letterSpacing: 1,
  },
  postingField: {
    marginBottom: 20,
  },
  postingLabel: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 10,
    letterSpacing: 0.3,
  },
  postingInput: {
    borderWidth: 1,
    borderRadius: 8,
    padding: 14,
    fontSize: 16,
    minHeight: 48,
  },
  postingTextarea: {
    borderWidth: 1,
    borderRadius: 8,
    padding: 14,
    fontSize: 16,
    minHeight: 120,
    textAlignVertical: 'top',
  },
  postingSection: {
    marginBottom: 28,
  },
  postingSectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 14,
    letterSpacing: 0.5,
  },
  colorGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginHorizontal: -4,
    marginTop: 4,
  },
  colorButton: {
    borderRadius: 8,
    paddingVertical: 11,
    paddingHorizontal: 18,
    margin: 4,
    borderWidth: 1.5,
    minWidth: 85,
    alignItems: 'center',
    justifyContent: 'center',
  },
  colorButtonSelected: {
    borderWidth: 2,
  },
  colorButtonText: {
    fontSize: 14,
    fontWeight: '600',
    textAlign: 'center',
    letterSpacing: 0.3,
  },
  genderContainer: {
    flexDirection: 'row',
    marginHorizontal: -4,
    marginTop: 4,
    gap: 8,
  },
  genderButton: {
    borderRadius: 8,
    paddingVertical: 13,
    paddingHorizontal: 20,
    margin: 4,
    borderWidth: 1.5,
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  genderButtonSelected: {
    borderWidth: 2,
  },
  genderButtonText: {
    fontSize: 14,
    fontWeight: '600',
    textAlign: 'center',
    letterSpacing: 0.5,
  },
  sizeCategoryRow: {
    marginBottom: 18,
  },
  sizeCategoryHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 10,
  },
  sizeCategoryLabel: {
    fontSize: 16,
    fontWeight: '600',
    flex: 1,
    letterSpacing: 0.3,
  },
  sizeChartIcon: {
    padding: 4,
    marginLeft: 4,
  },
  sizeOptionsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginLeft: 32,
    marginTop: 10,
    marginHorizontal: -4,
  },
  sizeOptionButton: {
    borderRadius: 8,
    paddingVertical: 9,
    paddingHorizontal: 18,
    margin: 4,
    borderWidth: 1.5,
    minWidth: 52,
    alignItems: 'center',
    justifyContent: 'center',
  },
  sizeOptionButtonSelected: {
    borderWidth: 2,
  },
  sizeOptionText: {
    fontSize: 14,
    fontWeight: '600',
    textAlign: 'center',
    letterSpacing: 0.2,
  },
  accessoriesRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 10,
  },
  accessoriesLabel: {
    fontSize: 16,
    fontWeight: '600',
    letterSpacing: 0.3,
  },
  accessoriesNote: {
    fontSize: 13,
    marginLeft: 32,
    fontStyle: 'italic',
    lineHeight: 18,
  },
  requiredNote: {
    fontSize: 12,
    marginBottom: 20,
    textAlign: 'center',
    marginTop: 4,
  },
  postButton: {
    borderRadius: 12,
    paddingVertical: 16,
    paddingHorizontal: 32,
    alignItems: 'center',
    marginTop: 12,
    width: '100%',
  },
  postButtonText: {
    fontSize: 18,
    fontWeight: 'bold',
    letterSpacing: 1.2,
  },
  // Chart Modal Styles
  chartModalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: Platform.OS === 'web' ? 10 : 5,
    paddingVertical: Platform.OS === 'web' ? 20 : 15,
  },
  chartModalContent: {
    borderRadius: 20,
    width: '90%',
    maxWidth: 400,
    maxHeight: '70%',
    padding: 6,
    paddingTop: Platform.OS === 'web' ? 36 : 34,
    paddingBottom: 6,
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
    alignSelf: 'center',
    overflow: 'hidden',
  },
  chartCloseButton: {
    position: 'absolute',
    top: Platform.OS === 'web' ? 6 : 8,
    right: Platform.OS === 'web' ? 6 : 8,
    zIndex: 10,
    padding: Platform.OS === 'web' ? 6 : 8,
    borderRadius: 20,
    backgroundColor: 'rgba(0, 0, 0, 0.1)',
  },
  chartModalImageContainer: {
    width: '100%',
    alignItems: 'center',
    justifyContent: 'center',
    paddingTop: 0,
    paddingBottom: 0,
  },
  chartImage: {
    width: '95%',
    maxWidth: 380,
    height: undefined,
    alignSelf: 'center',
    aspectRatio: undefined,
    marginHorizontal: 'auto',
  },
});
