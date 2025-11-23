import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as ImagePicker from 'expo-image-picker';
import { useFocusEffect, useLocalSearchParams, useRouter } from 'expo-router';
import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
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
    View,
} from 'react-native';
import { API_ENDPOINTS } from '../config/api';
import { useSocket } from './contexts/SocketContext';
import { useTheme } from './contexts/ThemeContext';

interface Message {
  id: string;
  text: string;
  senderId: string;
  senderName: string;
  senderAvatar: string | number | { uri: string };
  timestamp: Date;
  isFromCurrentUser: boolean;
}

// Using backend signed uploads for report evidence photos

const normalizeParam = (value: string | string[] | undefined) => {
  if (Array.isArray(value)) {
    return value[0];
  }
  return value;
};

const isLocalUri = (uri?: string | null): uri is string => {
  if (!uri) return false;
  return uri.startsWith('file://') || uri.startsWith('data:');
};

const uploadEvidencePhoto = async (uri: string | any) => {
  // Ensure uri is a string - extract from object if needed
  let uriString: string;
  if (typeof uri === 'string') {
    uriString = uri;
  } else if (uri && typeof uri === 'object' && uri.uri) {
    uriString = uri.uri;
  } else if (uri && typeof uri === 'object' && uri.url) {
    uriString = uri.url;
  } else {
    throw new Error(`Invalid photo URI: expected string or object with uri/url, got ${typeof uri}`);
  }

  if (!isLocalUri(uriString)) {
    return uriString;
  }

  // Signed direct upload: request signature from backend, then upload to Cloudinary
  const token = await AsyncStorage.getItem('token');
  if (!token) {
    throw new Error('Authentication required. Please log in again.');
  }

  const sigResp = await fetch(`${API_ENDPOINTS.wardrobe}signature`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`,
    },
    body: JSON.stringify({ folder: 'glamora/reports' }),
  });

  if (!sigResp.ok) {
    let msg = `Failed to get upload signature (${sigResp.status})`;
    try {
      const j = await sigResp.json();
      if (j?.message) msg = j.message;
    } catch {}
    throw new Error(msg);
  }

  const sigData = await sigResp.json();
  if (!sigData || !sigData.cloudName || !sigData.apiKey || !sigData.timestamp || !sigData.signature) {
    throw new Error('Invalid signature response from server');
  }

  const { cloudName, apiKey, timestamp, folder, signature } = sigData;
  const uploadUrl = `https://api.cloudinary.com/v1_1/${cloudName}/image/upload`;

  const form = new FormData();
  
  // Web platform requires File/Blob object, mobile uses URI object
  if (Platform.OS === 'web') {
    // Convert data URI to File/Blob for web
    let file: File | Blob;
    if (uriString.startsWith('data:')) {
      // Convert data URI to Blob
      const response = await fetch(uriString);
      const blob = await response.blob();
      file = new File([blob], `evidence-${Date.now()}.jpg`, { type: 'image/jpeg' });
    } else {
      // If it's already a web URL, fetch and convert to File
      const response = await fetch(uriString);
      const blob = await response.blob();
      file = new File([blob], `evidence-${Date.now()}.jpg`, { type: 'image/jpeg' });
    }
    form.append('file', file);
  } else {
    // Mobile: keep existing code unchanged
    form.append('file', {
      uri: uriString,
      type: 'image/jpeg',
      name: `evidence-${Date.now()}.jpg`,
    } as any);
  }
  
  form.append('api_key', String(apiKey));
  form.append('timestamp', String(timestamp));
  form.append('signature', String(signature));
  form.append('folder', String(folder || 'glamora/reports'));

  const uploadResp = await fetch(uploadUrl, { method: 'POST', body: form });
  if (!uploadResp.ok) {
    let message = `Cloudinary upload failed (${uploadResp.status})`;
    try {
      const errJson = await uploadResp.json();
      if (errJson?.error?.message) {
        message = errJson.error.message;
      } else if (errJson?.message) {
        message = errJson.message;
      }
    } catch {
      const t = await uploadResp.text();
      if (t) message = t;
    }
    throw new Error(message);
  }

  const data = await uploadResp.json();
  if (!data?.secure_url) {
    throw new Error('Cloudinary response missing secure_url');
  }

  return { url: data.secure_url as string, filename: (data.public_id as string) || null };
};

export default function MessageUser() {
  const router = useRouter();
  const { theme } = useTheme();
  const { sellerId, sellerEmail, sellerProfilePicture, productName, productImage, itemId } = useLocalSearchParams();
  const [messages, setMessages] = useState<Message[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [currentUser, setCurrentUser] = useState<any>(null);
  const [otherUser, setOtherUser] = useState<any>(null);
  const [showReportModal, setShowReportModal] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [selectedReportReason, setSelectedReportReason] = useState('');
  const [reportMessage, setReportMessage] = useState('');
  const [evidencePhotos, setEvidencePhotos] = useState<string[]>([]);
  const [reportSubmitting, setReportSubmitting] = useState(false);
  const [otherUserTyping, setOtherUserTyping] = useState(false);
  const [otherUserId, setOtherUserId] = useState<string | null>(null);
  const scrollViewRef = useRef<ScrollView>(null);
  const typingTimeoutRef = useRef<any>(null);
  
  // Socket.IO context
  const { socket, sendMessage: sendSocketMessage, joinChat, leaveChat, sendTyping } = useSocket();

  const normalizedProductName = normalizeParam(productName);
  const normalizedProductImage = normalizeParam(productImage);
  const normalizedProductId = normalizeParam(itemId);
  const [contextProductName, setContextProductName] = useState<string | null>(normalizedProductName || null);
  const [contextProductImage, setContextProductImage] = useState<string | null>(normalizedProductImage || null);
  const [contextProductId, setContextProductId] = useState<string | null>(normalizedProductId || null);
  const defaultProductImage = 'https://via.placeholder.com/120?text=Item';

  const isAdminConversation = !!otherUser && otherUser.role === 'admin';

  const loadCurrentUser = async () => {
    try {
      const userData = await AsyncStorage.getItem('user');
      if (userData) {
        setCurrentUser(JSON.parse(userData));
      }
    } catch (error) {
      console.error('Error loading current user:', error);
    }
  };

  const loadMessages = useCallback(async () => {
    try {
      const token = await AsyncStorage.getItem('token');
      const userData = await AsyncStorage.getItem('user');
      const currentUser = userData ? JSON.parse(userData) : null;

      if (!currentUser) {
        console.error('No current user found');
        return;
      }

      // Find the seller user by email
      const sellerEmailStr = Array.isArray(sellerEmail) ? sellerEmail[0] : sellerEmail;
      const userController = new AbortController();
      const userTimeoutId = setTimeout(() => userController.abort(), 10000); // 10 second timeout
      
      const response = await fetch(API_ENDPOINTS.getUser(sellerEmailStr), {
        headers: {
          'Authorization': `Bearer ${token}`,
        },
        signal: userController.signal,
      });
      
      clearTimeout(userTimeoutId);

      if (response.ok) {
        const sellerData = await response.json();
        const sellerUserId = sellerData.user._id;
        
        // Set the other user information
        setOtherUserId(sellerUserId);
        setOtherUser(sellerData.user);

        // Now get chat messages with the seller
        const chatController = new AbortController();
        const chatTimeoutId = setTimeout(() => chatController.abort(), 10000); // 10 second timeout
        
        const chatResponse = await fetch(API_ENDPOINTS.chatMessages(sellerUserId), {
          headers: {
            'Authorization': `Bearer ${token}`,
          },
          signal: chatController.signal,
        });
        
        clearTimeout(chatTimeoutId);

        if (chatResponse.ok) {
          const data = await chatResponse.json();
          console.log('Loaded messages from API:', data.messages);

          // Transform the messages to match our Message interface
          const transformedMessages = (data.messages || []).map((msg: any) => {
            const msgSenderId = msg.senderId._id || msg.senderId;
            // More robust user ID comparison
            const isFromMe = msgSenderId === currentUser.id || 
                           msgSenderId === currentUser._id ||
                           (msg.senderId && msg.senderId._id === currentUser.id) ||
                           (msg.senderId && msg.senderId._id === currentUser._id);
            
            // Get profile picture from populated senderId or fallback
            const senderProfilePicture = msg.senderId?.profilePicture?.url || 
                                        (isFromMe ? currentUser?.profilePicture?.url : sellerData.user?.profilePicture?.url);
            
            console.log('🔍 Message transformation:', {
              msgSenderId,
              currentUserId: currentUser.id,
              currentUser_id: currentUser._id,
              isFromMe,
              messageText: msg.text,
              senderProfilePicture: senderProfilePicture ? 'Found' : 'Not found'
            });
            
            return {
              id: msg._id,
              text: msg.text,
              senderId: msgSenderId,
              senderName: isFromMe ? 
                (currentUser.name || 'You') : 
                (msg.senderId?.name || sellerData.user.name || sellerData.user.email?.split('@')[0] || 'Other User'),
              senderAvatar: senderProfilePicture 
                ? { uri: senderProfilePicture }
                : require('../assets/avatar.png'),
              timestamp: new Date(msg.timestamp),
              isFromCurrentUser: isFromMe
            };
          });
          setMessages(transformedMessages);
        } else {
          console.log('No messages found, setting default message');
          // If no messages exist, create initial message
          setMessages([{
            id: '1',
            text: 'Hello',
            senderId: sellerUserId,
            senderName: sellerId as string,
            senderAvatar: require('../assets/avatar.png'),
            timestamp: new Date(),
            isFromCurrentUser: false
          }]);
        }
      } else {
        console.log('Failed to find seller, setting default message');
        // Set default message if API fails
        setMessages([{
          id: '1',
          text: 'Hello',
          senderId: sellerId as string,
          senderName: sellerId as string,
          senderAvatar: require('../assets/avatar.png'),
          timestamp: new Date(),
          isFromCurrentUser: false
        }]);
      }
    } catch (error: any) {
      console.error('Error loading messages:', error);
      
      if (error?.name === 'AbortError') {
        Alert.alert('Timeout', 'Request timed out. Please check your connection and try again.');
      }
      
      // Set default message if API fails
      setMessages([{
        id: '1',
        text: 'Hello',
        senderId: sellerId as string,
        senderName: sellerId as string,
        senderAvatar: require('../assets/avatar.png'),
        timestamp: new Date(),
        isFromCurrentUser: false
      }]);
    }
  }, [sellerEmail, sellerId]);

  const fetchConversationContext = async (targetId: string) => {
    try {
      const token = await AsyncStorage.getItem('token');
      if (!token) return;
      const response = await fetch(API_ENDPOINTS.chatContext(targetId), {
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });
      if (response.ok) {
        const data = await response.json();
        if (data.context) {
          if (data.context.productName) {
            setContextProductName(data.context.productName);
          }
          if (data.context.productImage) {
            setContextProductImage(data.context.productImage);
          }
          if (data.context.productId) {
            setContextProductId(data.context.productId);
          }
        }
      }
    } catch (error) {
      console.error('Error fetching conversation context:', error);
    }
  };

  const updateConversationContext = async (targetId: string, productIdValue?: string | null, productNameValue?: string | null, productImageValue?: string | null) => {
    try {
      const token = await AsyncStorage.getItem('token');
      if (!token) return;
      await fetch(API_ENDPOINTS.chatContextUpdate, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({
          targetUserId: targetId,
          productId: productIdValue || null,
          productName: productNameValue || '',
          productImage: productImageValue || '',
        }),
      });
    } catch (error) {
      console.error('Error updating conversation context:', error);
    }
  };

  useEffect(() => {
    if (!otherUserId) return;
    (async () => {
      try {
        if (normalizedProductName || normalizedProductImage) {
          await updateConversationContext(otherUserId, normalizedProductId, normalizedProductName, normalizedProductImage);
          if (normalizedProductName) {
            setContextProductName(normalizedProductName);
          }
          if (normalizedProductImage) {
            setContextProductImage(normalizedProductImage);
          }
          if (normalizedProductId) {
            setContextProductId(normalizedProductId);
          }
        }
        await fetchConversationContext(otherUserId);
      } catch (error) {
        console.error('Error syncing conversation context:', error);
      }
    })();
  }, [otherUserId, normalizedProductId, normalizedProductName, normalizedProductImage]);

  // Socket.IO effects
  useEffect(() => {
    if (socket && otherUserId) {
      console.log('🔌 Setting up Socket.IO listeners for user:', otherUserId);
      
      // Join chat room
      joinChat(otherUserId);
      
      // Listen for new messages
      const handleNewMessage = (data: any) => {
        console.log('📨 Received real-time message:', data);
        if (data.fromUserId === otherUserId || data.toUserId === otherUserId) {
          // More robust user ID comparison for real-time messages
          const isFromMe = data.fromUserId === currentUser?.id || 
                          data.fromUserId === currentUser?._id;
          
          console.log('🔍 Real-time message transformation:', {
            fromUserId: data.fromUserId,
            currentUserId: currentUser?.id,
            currentUser_id: currentUser?._id,
            isFromMe,
            messageText: data.message
          });
          
          const newMsg: Message = {
            id: data._id || Date.now().toString(),
            text: data.message,
            senderId: data.fromUserId,
            senderName: isFromMe ? currentUser?.name || 'You' : otherUser?.name || 'Other User',
            senderAvatar: isFromMe ? 
              (currentUser?.profilePicture?.url ? { uri: currentUser.profilePicture.url } : require('../assets/avatar.png')) :
              (otherUser?.profilePicture?.url ? { uri: otherUser.profilePicture.url } : require('../assets/avatar.png')),
            timestamp: new Date(data.timestamp),
            isFromCurrentUser: isFromMe
          };
          
          setMessages(prev => {
            // Avoid duplicates
            const exists = prev.some(msg => msg.id === newMsg.id);
            if (!exists) {
              return [...prev, newMsg];
            }
            return prev;
          });
          
          // Scroll to bottom
          setTimeout(() => {
            scrollViewRef.current?.scrollToEnd({ animated: true });
          }, 100);
        }
      };
      
      // Listen for typing indicators
      const handleUserTyping = (data: any) => {
        if (data.userId === otherUserId) {
          setOtherUserTyping(data.isTyping);
          
          // Auto-clear typing indicator after 3 seconds
          if (data.isTyping) {
            if (typingTimeoutRef.current) {
              clearTimeout(typingTimeoutRef.current);
            }
            typingTimeoutRef.current = setTimeout(() => {
              setOtherUserTyping(false);
            }, 3000);
          }
        }
      };
      
      socket.on('new-message', handleNewMessage);
      socket.on('user-typing', handleUserTyping);
      
      return () => {
        socket.off('new-message', handleNewMessage);
        socket.off('user-typing', handleUserTyping);
        leaveChat(otherUserId);
        if (typingTimeoutRef.current) {
          clearTimeout(typingTimeoutRef.current);
        }
      };
    }
  }, [socket, otherUserId, currentUser, otherUser, sellerId, joinChat, leaveChat]);

  useEffect(() => {
    loadCurrentUser();
    loadMessages();
  }, [loadMessages]);

  // Auto-scroll to bottom when messages change
  useEffect(() => {
    if (messages.length > 0) {
      // Multiple scroll attempts for better reliability
      setTimeout(() => {
        scrollViewRef.current?.scrollToEnd({ animated: true });
      }, 50);
      setTimeout(() => {
        scrollViewRef.current?.scrollToEnd({ animated: false });
      }, 200);
    }
  }, [messages]);

  // Reload messages when screen comes into focus
  useFocusEffect(
    useCallback(() => {
      loadMessages();
    }, [loadMessages])
  );

  const sendMessage = async () => {
    if (!newMessage.trim()) return;
    if (isAdminConversation) {
      return;
    }

    console.log('📝 Sending message:', newMessage.trim());
    const messageText = newMessage.trim();

    const message: Message = {
      id: Date.now().toString(),
      text: messageText,
      senderId: currentUser?.id || currentUser?._id || 'currentUser',
      senderName: currentUser?.name || 'You',
      senderAvatar: currentUser?.profilePicture?.url ? { uri: currentUser.profilePicture.url } : require('../assets/avatar.png'),
      timestamp: new Date(),
      isFromCurrentUser: true
    };
    
    console.log('📝 Creating sent message:', {
      senderId: message.senderId,
      currentUserId: currentUser?.id,
      currentUser_id: currentUser?._id,
      isFromCurrentUser: message.isFromCurrentUser,
      messageText: message.text
    });

    // Add message to local state immediately for better UX
    setMessages(prev => [...prev, message]);
    setNewMessage('');

    // Stop typing indicator
    if (otherUserId) {
      sendTyping(otherUserId, false);
    }

    // Try Socket.IO first for real-time messaging
    if (socket && socket.connected && otherUserId) {
      console.log('📡 Sending via Socket.IO');
      sendSocketMessage(otherUserId, messageText, contextProductId || undefined, contextProductName || undefined);
      
      // Scroll to bottom
      setTimeout(() => {
        scrollViewRef.current?.scrollToEnd({ animated: true });
      }, 100);
      return;
    }

    console.log('📡 Socket.IO not available, falling back to HTTP API');

    try {
      const token = await AsyncStorage.getItem('token');
      
      console.log('🔍 Looking up seller by email:', sellerEmail);
      
      // Find the seller user by email
      const sellerEmailStr = Array.isArray(sellerEmail) ? sellerEmail[0] : sellerEmail;
      const userResponse = await fetch(API_ENDPOINTS.getUser(sellerEmailStr), {
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });

      if (userResponse.ok) {
        const sellerData = await userResponse.json();
        const sellerUserId = sellerData.user._id;
        
        console.log('✅ Found seller user:', sellerData.user.email);
        console.log('📤 Sending message to seller ID:', sellerUserId);
        
        // Send message to the seller
        const response = await fetch(API_ENDPOINTS.chatSend, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`,
          },
          body: JSON.stringify({
            receiverId: sellerUserId,
            text: messageText,
            productId: contextProductId,
            productName: contextProductName,
            productImage: contextProductImage,
          }),
        });

        if (response.ok) {
          console.log('✅ Message sent successfully via HTTP');
          
          // Mark messages as read
          await fetch(API_ENDPOINTS.chatMarkRead(sellerUserId), {
            method: 'PUT',
            headers: {
              'Authorization': `Bearer ${token}`,
            },
          });
        } else {
          console.error('❌ Failed to send message via HTTP:', response.status);
        }
      } else {
        console.error('❌ Failed to find seller user');
      }
    } catch (error) {
      console.error('❌ Error sending message:', error);
    }
  };

  // Handle typing indicators
  const handleTextChange = (text: string) => {
    setNewMessage(text);
    
    // Send typing indicator via Socket.IO
    if (otherUserId && socket && socket.connected) {
      if (text.length > 0) {
        sendTyping(otherUserId, true);
        
        // Clear existing timeout
        if (typingTimeoutRef.current) {
          clearTimeout(typingTimeoutRef.current);
        }
        
        // Stop typing after 2 seconds of inactivity
        typingTimeoutRef.current = setTimeout(() => {
          sendTyping(otherUserId, false);
        }, 2000);
      } else {
        sendTyping(otherUserId, false);
        if (typingTimeoutRef.current) {
          clearTimeout(typingTimeoutRef.current);
        }
      }
    }
  };

  const pickImage = async () => {
    const permissionResult = await ImagePicker.requestMediaLibraryPermissionsAsync();
    
    if (permissionResult.granted === false) {
      Alert.alert('Permission Required', 'Permission to access camera roll is required!');
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      aspect: [4, 3],
      quality: 0.8,
    });

    if (!result.canceled && result.assets[0]) {
      setEvidencePhotos(prev => [...prev, result.assets[0].uri]);
    }
  };

  const removePhoto = (index: number) => {
    setEvidencePhotos(prev => prev.filter((_, i) => i !== index));
  };

  const submitReport = async () => {
    if (!selectedReportReason) {
      Alert.alert('Error', 'Please select a reason for reporting');
      return;
    }

    if (!evidencePhotos.length) {
      Alert.alert('Evidence Required', 'Please attach at least one evidence photo.');
      return;
    }

    if (reportSubmitting) {
      return;
    }

    try {
      setReportSubmitting(true);
      const token = await AsyncStorage.getItem('token');
      console.log('Token retrieved:', token ? 'Token exists' : 'No token found');
      
      if (!token) {
        Alert.alert('Error', 'Please log in to submit a report');
        return;
      }

      // Find the seller user by email
      const sellerEmailStr = Array.isArray(sellerEmail) ? sellerEmail[0] : sellerEmail;
      console.log('Looking up user with email:', sellerEmailStr);
      
      const userResponse = await fetch(API_ENDPOINTS.getUser(sellerEmailStr), {
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });

      console.log('User lookup response status:', userResponse.status);
      
      if (userResponse.ok) {
        const sellerData = await userResponse.json();
        console.log('Seller data:', sellerData);
        const sellerUserId = sellerData.user._id;
        console.log('Seller user ID:', sellerUserId);

        // Upload photos to Cloudinary if any
        const uploadedPhotos: { url: string; filename?: string | null }[] = [];
        if (evidencePhotos.length > 0) {
          for (const photoUri of evidencePhotos) {
            try {
              // Ensure we have a valid URI string (handle both string and object cases)
              let uriToUpload: string;
              if (typeof photoUri === 'string') {
                uriToUpload = photoUri;
              } else if (photoUri && typeof photoUri === 'object') {
                uriToUpload = (photoUri as any).uri || (photoUri as any).url || String(photoUri);
              } else {
                uriToUpload = String(photoUri);
              }
              if (!uriToUpload || typeof uriToUpload !== 'string') {
                throw new Error('Invalid photo URI format');
              }
              const uploaded = await uploadEvidencePhoto(uriToUpload);
              if (typeof uploaded === 'string') {
                uploadedPhotos.push({
                  url: uploaded,
                  filename: null,
                });
              } else {
                uploadedPhotos.push({
                  url: uploaded.url,
                  filename: uploaded.filename || null,
                });
              }
            } catch (uploadError: any) {
              console.error('Evidence upload failed:', uploadError);
              Alert.alert('Upload Error', 'Failed to upload an evidence photo. Please try again.');
              return;
            }
          }
        }

        const trimmedMessage = reportMessage.trim();

        console.log('Submitting report with data:', {
          reportedUserId: sellerUserId,
          reason: (reportReasons.find(r => r.key === selectedReportReason)?.title) || selectedReportReason,
          description: trimmedMessage,
          evidencePhotos: uploadedPhotos,
          marketplaceItemId: contextProductId,
        });

        const response = await fetch(API_ENDPOINTS.report, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`,
          },
          body: JSON.stringify({
            reportedUserId: sellerUserId,
            reason: (reportReasons.find(r => r.key === selectedReportReason)?.title) || selectedReportReason,
            description: trimmedMessage,
            evidencePhotos: uploadedPhotos,
            marketplaceItemId: contextProductId,
          }),
        });

        console.log('Report submission response status:', response.status);
        
        if (response.ok) {
          const result = await response.json();
          console.log('Report submission success:', result);
          Alert.alert('Success', 'Report submitted successfully');
          setShowReportModal(false);
          setSelectedReportReason('');
          setReportMessage('');
          setEvidencePhotos([]);
        } else {
          const errorData = await response.json();
          console.log('Report submission error:', errorData);
          Alert.alert('Error', `Failed to submit report: ${errorData.message || 'Unknown error'}`);
        }
      } else {
        const errorData = await userResponse.json();
        console.log('User lookup error:', errorData);
        Alert.alert('Error', `Failed to find user to report: ${errorData.message || 'User not found'}`);
      }
    } catch (error) {
      console.error('Error submitting report:', error);
      Alert.alert('Error', 'Failed to submit report');
    } finally {
      setReportSubmitting(false);
    }
  };

  const deleteConversation = async () => {
    try {
      const token = await AsyncStorage.getItem('token');
      const otherId = (otherUser && (otherUser as any)._id) || otherUserId;
      console.log('🗑️ Attempting to delete conversation with user ID:', otherId);
      
      if (!otherId) { 
        console.log('❌ No other user ID found');
        setShowDeleteModal(false); 
        return; 
      }
      
      const deleteUrl = API_ENDPOINTS.chatDeleteConversation(otherId as string);
      console.log('🌐 Delete URL:', deleteUrl);
      
      const resp = await fetch(deleteUrl, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${token}` },
      });
      
      console.log('📡 Delete response status:', resp.status);
      
      if (resp.ok) {
        console.log('✅ Conversation deleted successfully');
        setShowDeleteModal(false);
        setMessages([]);
        // Use replace to prevent going back to deleted conversation
        setTimeout(() => {
          console.log('🔄 Navigating back to message-box');
          router.replace('/message-box');
        }, 100);
      } else {
        const errorText = await resp.text();
        console.log('❌ Failed to delete conversation, status:', resp.status, 'error:', errorText);
        setShowDeleteModal(false);
        Alert.alert('Error', 'Failed to delete conversation');
      }
    } catch (error) {
      console.log('💥 Delete conversation error:', error);
      setShowDeleteModal(false);
      Alert.alert('Error', 'Failed to delete conversation');
    }
  };

  const reportReasons = [
    {
      key: 'scam',
      title: 'Scam',
      description: 'Seller scammed me by requesting payment outside the app and never shipped the item.'
    },
    {
      key: 'fake-product-claim',
      title: 'Fake Product Claim',
      description: 'Seller falsely claimed the item was authentic when it wasn\'t.'
    },
    {
      key: 'inappropriate-chat',
      title: 'Inappropriate Chat Behavior',
      description: 'Seller made inappropriate/unprofessional comments during the transaction.'
    },
    {
      key: 'bait-and-switch',
      title: 'Bait-and-Switch Listing',
      description: 'Seller used misleading pricing to bait users.'
    },
    {
      key: 'pressure-tactics',
      title: 'Pressure Tactics / Rushing Payment',
      description: 'Seller is using pressure tactics to rush payment outside safe channels.'
    }
  ];

  const canSubmitReport = Boolean(
    selectedReportReason &&
    evidencePhotos.length > 0 &&
    !reportSubmitting
  );

  const renderMessage = ({ item }: { item: Message }) => (
    <View style={[
      styles.messageContainer,
      item.isFromCurrentUser ? styles.sentMessageContainer : styles.receivedMessageContainer
    ]}>
      <View style={[
        styles.messageBubble,
        item.isFromCurrentUser 
          ? [styles.messageBubbleRight, { backgroundColor: theme.colors.buttonBackground }]
          : [styles.messageBubbleLeft, { backgroundColor: theme.colors.containerBackground }]
      ]}>
        <Text style={[
          styles.messageText,
          item.isFromCurrentUser 
            ? [styles.sentText, { color: theme.colors.buttonText }]
            : [styles.receivedText, { color: theme.colors.primaryText }]
        ]}>
          {item.text}
        </Text>
      </View>
    </View>
  );

  return (
    <KeyboardAvoidingView 
      style={[styles.container, { backgroundColor: theme.colors.bodyBackground }]}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : 20}
    >
      {/* Header */}
      <View style={[styles.header, { backgroundColor: theme.colors.headerBackground }]}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
          <Ionicons name="arrow-back" size={24} color={theme.colors.icon} />
        </TouchableOpacity>
        
        <View style={styles.headerCenter}>
          <Image
            source={
              (sellerProfilePicture && (Array.isArray(sellerProfilePicture) ? sellerProfilePicture[0] : sellerProfilePicture)) || 
              otherUser?.profilePicture?.url
                ? { uri: (sellerProfilePicture && (Array.isArray(sellerProfilePicture) ? sellerProfilePicture[0] : sellerProfilePicture)) || otherUser?.profilePicture?.url }
                : require('../assets/avatar.png')
            }
            style={styles.headerAvatar}
          />
          <Text style={[styles.headerName, { color: theme.colors.headerText }]}>
            {otherUser?.name || otherUser?.email?.split('@')[0] || 'User'}
          </Text>
        </View>
        
        <View style={styles.headerActions}>
          {!isAdminConversation && (
            <TouchableOpacity onPress={() => setShowReportModal(true)} style={styles.actionButton}>
              <Ionicons name="warning-outline" size={24} color="#FF3B30" />
            </TouchableOpacity>
          )}
          <TouchableOpacity style={styles.actionButton} onPress={() => setShowDeleteModal(true)}>
            <Ionicons name="trash-outline" size={24} color="#FF3B30" />
          </TouchableOpacity>
        </View>
      </View>

      {/* Product Info - hidden for admin announcements */}
      {!isAdminConversation && (
        <View style={styles.productSection}>
          <View style={[styles.productCard, { backgroundColor: 'rgba(255, 255, 255, 0.7)' }]}>
            <Image source={{ uri: (contextProductImage as string) || defaultProductImage }} style={styles.productImage} />
            <View style={styles.productInfo}>
              <Text style={[styles.productName, { color: theme.colors.primaryText }]} numberOfLines={2}>
                {contextProductName || 'Conversation'}
              </Text>
            </View>
          </View>
        </View>
      )}

      {/* Chat Messages */}
      <ScrollView 
        ref={scrollViewRef}
        style={styles.chatArea} 
        contentContainerStyle={[styles.chatContent, { flexGrow: 1 }]}
        onContentSizeChange={() => {
          setTimeout(() => scrollViewRef.current?.scrollToEnd({ animated: true }), 50);
        }}
        onLayout={() => {
          setTimeout(() => scrollViewRef.current?.scrollToEnd({ animated: false }), 100);
        }}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
        automaticallyAdjustKeyboardInsets={true}
        maintainVisibleContentPosition={{
          minIndexForVisible: 0,
          autoscrollToTopThreshold: 10,
        }}
      >
        {messages.map((message) => (
          <View key={message.id}>
            {renderMessage({ item: message })}
          </View>
        ))}
        
        {/* Typing Indicator */}
        {otherUserTyping && (
          <View style={[styles.messageContainer, styles.receivedMessageContainer]}>
            <View style={[styles.messageBubble, styles.messageBubbleLeft, styles.typingBubble, { backgroundColor: theme.colors.containerBackground }]}>
              <Text style={[styles.typingText, { color: theme.colors.secondaryText }]}>Typing...</Text>
              <View style={styles.typingDots}>
                <View style={[styles.typingDot, styles.typingDot1]} />
                <View style={[styles.typingDot, styles.typingDot2]} />
                <View style={[styles.typingDot, styles.typingDot3]} />
              </View>
            </View>
          </View>
        )}
      </ScrollView>

      {/* Message Input */}
      <View style={[styles.inputContainer, { backgroundColor: theme.colors.headerBackground }]}>
        {isAdminConversation ? (
          <View style={[styles.adminNoticeContainer, { backgroundColor: theme.colors.containerBackground }]}>
            <Text style={[styles.adminNoticeText, { color: theme.colors.secondaryText }]}>
              You can view announcements from Admin here. Replies are disabled.
            </Text>
          </View>
        ) : (
          <>
            <View style={[styles.inputWrapper, { backgroundColor: theme.colors.containerBackground }]}>
              <TextInput
                style={[styles.textInput, { color: theme.colors.primaryText }]}
                placeholder="Write a message."
                placeholderTextColor={theme.colors.secondaryText}
                value={newMessage}
                onChangeText={handleTextChange}
                multiline={true}
                textAlignVertical="center"
                returnKeyType="send"
                onSubmitEditing={sendMessage}
                blurOnSubmit={false}
              />
            </View>
            <TouchableOpacity style={[styles.sendButton, { backgroundColor: theme.colors.buttonBackground }]} onPress={sendMessage}>
              <Ionicons name="send" size={20} color={theme.colors.buttonText} />
            </TouchableOpacity>
          </>
        )}
      </View>

      {/* Report Modal */}
      <Modal
        visible={showReportModal}
        transparent
        animationType="fade"
        onRequestClose={() => setShowReportModal(false)}
      >
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
          style={styles.modalOverlay}
        >
          <View style={[styles.reportModal, { backgroundColor: theme.colors.containerBackground }]}>
            <View style={styles.reportHeader}>
              <TouchableOpacity onPress={() => setShowReportModal(false)} style={styles.headerClose}>
                <Ionicons name="close" size={24} color={theme.colors.icon} />
              </TouchableOpacity>
              <Text style={[styles.reportTitle, { color: theme.colors.primaryText }]}>REPORT USER</Text>
              <View style={{ width: 24 }} />
            </View>

            <ScrollView
              style={styles.reportScroll}
              contentContainerStyle={styles.reportScrollContent}
              keyboardShouldPersistTaps="handled"
              nestedScrollEnabled
              showsVerticalScrollIndicator={false}
            >
              <View style={styles.reportSection}>
                <Text style={[styles.sectionLabel, { color: theme.colors.primaryText }]}>Report Type *</Text>
                {reportReasons.map((reason, index) => (
                  <TouchableOpacity
                    key={index}
                    style={[
                      styles.reportOption,
                      { backgroundColor: theme.colors.containerBackground },
                      selectedReportReason === reason.key && { backgroundColor: theme.colors.buttonBackground }
                    ]}
                    onPress={() => setSelectedReportReason(reason.key)}
                  >
                    <View style={[
                      styles.checkbox,
                      { borderColor: theme.colors.border },
                      selectedReportReason === reason.key && { backgroundColor: theme.colors.accent, borderColor: theme.colors.accent }
                    ]}>
                      {selectedReportReason === reason.key && (
                        <Ionicons name="checkmark" size={16} color={theme.colors.buttonText} />
                      )}
                    </View>
                    <View style={styles.reportTextContainer}>
                      <Text style={[styles.reportTitleText, { color: theme.colors.primaryText }]}>{reason.title}</Text>
                      <Text style={[styles.reportDescription, { color: theme.colors.secondaryText }]}>{reason.description}</Text>
                    </View>
                  </TouchableOpacity>
                ))}
              </View>

              <View style={styles.reportSection}>
                <Text style={[styles.sectionLabel, { color: theme.colors.primaryText }]}>Add Message (Optional)</Text>
                <Text style={[styles.sectionHelper, { color: theme.colors.secondaryText }]}>
                  Provide details to help the admin understand the situation.
                </Text>
                <TextInput
                  style={[styles.reportMessageInput, { backgroundColor: theme.colors.containerBackground, color: theme.colors.primaryText, borderColor: theme.colors.border }]}
                  placeholder="Provide a detailed description of the issue..."
                  placeholderTextColor={theme.colors.secondaryText}
                  value={reportMessage}
                  onChangeText={setReportMessage}
                  multiline
                  textAlignVertical="top"
                  maxLength={500}
                />
              </View>

              <View style={[styles.reportSection, styles.photoEvidenceSection]}>
                <View style={styles.sectionHeaderRow}>
                  <Text style={[styles.sectionLabel, { color: theme.colors.primaryText }]}>Add Evidence Photo *</Text>
                  <Text style={[styles.requiredHint, { color: theme.colors.accent }]}>Required</Text>
                </View>
                <Text style={[styles.sectionHelper, { color: theme.colors.secondaryText }]}>
                  Attach at least one screenshot or photo that supports your report.
                </Text>
                <TouchableOpacity style={[styles.addPhotoButton, { backgroundColor: theme.colors.buttonBackground }]} onPress={pickImage}>
                  <Ionicons name="camera" size={20} color={theme.colors.buttonText} />
                  <Text style={[styles.addPhotoText, { color: theme.colors.buttonText }]}>Add Photo</Text>
                </TouchableOpacity>
                
                {evidencePhotos.length > 0 && (
                  <View style={styles.photosContainer}>
                    {evidencePhotos.map((photo, index) => (
                      <View key={index} style={styles.photoItem}>
                        <Image source={{ uri: photo }} style={styles.photoPreview} />
                        <TouchableOpacity 
                          style={styles.removePhotoButton} 
                          onPress={() => removePhoto(index)}
                        >
                          <Ionicons name="close-circle" size={20} color="#FF3B30" />
                        </TouchableOpacity>
                      </View>
                    ))}
                  </View>
                )}
              </View>
            </ScrollView>

            <TouchableOpacity
              style={[
                styles.submitButton,
                { backgroundColor: theme.colors.buttonBackground },
                (!canSubmitReport) && { opacity: 0.5 }
              ]}
              onPress={submitReport}
              disabled={!canSubmitReport}
            >
              <Text style={[styles.submitButtonText, { color: theme.colors.buttonText }]}>
                {reportSubmitting ? 'Submitting...' : 'Submit'}
              </Text>
            </TouchableOpacity>
          </View>
        </KeyboardAvoidingView>
      </Modal>

      {/* Delete Conversation Modal */}
      <Modal
        visible={showDeleteModal}
        transparent
        animationType="fade"
        onRequestClose={() => setShowDeleteModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={[styles.reportContent, { backgroundColor: theme.colors.containerBackground }]}>
            <View style={styles.reportHeader}>
              <Text style={[styles.reportTitle, { color: theme.colors.primaryText }]}>Delete Conversation</Text>
              <TouchableOpacity onPress={() => setShowDeleteModal(false)}>
                <Ionicons name="close" size={24} color={theme.colors.icon} />
              </TouchableOpacity>
            </View>
            <Text style={{ fontSize: 16, color: theme.colors.primaryText, marginBottom: 16 }}>
              Are you sure you want to delete this conversation?
            </Text>
            <View style={{ flexDirection: 'row', justifyContent: 'flex-end', gap: 12 }}>
              <TouchableOpacity style={[styles.deleteCancelButton, { backgroundColor: theme.colors.containerBackground }]} onPress={() => setShowDeleteModal(false)}>
                <Text style={[styles.deleteCancelButtonText, { color: theme.colors.primaryText }]}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity style={[styles.deleteConfirmButton, { backgroundColor: theme.colors.buttonBackground }]} onPress={deleteConversation}>
                <Text style={[styles.deleteConfirmButtonText, { color: theme.colors.buttonText }]}>Yes</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F5F5F5',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingTop: 60,
    paddingBottom: 16,
    backgroundColor: '#F5F5F5',
  },
  backButton: {
    padding: 8,
  },
  headerCenter: {
    alignItems: 'center',
    flex: 1,
  },
  headerAvatar: {
    width: 50,
    height: 50,
    borderRadius: 25,
    marginBottom: 8,
  },
  headerName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#000',
  },
  headerActions: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  actionButton: {
    marginLeft: 16,
    padding: 4,
  },
  productSection: {
    paddingHorizontal: 16,
    paddingBottom: 16,
  },
  productCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'white',
    borderRadius: 12,
    padding: 12,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 1,
    },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  productImage: {
    width: 60,
    height: 60,
    borderRadius: 8,
    marginRight: 12,
  },
  productInfo: {
    flex: 1,
  },
  productName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#000',
  },
  chatArea: {
    flex: 1,
    backgroundColor: '#F5F5F5',
  },
  chatContent: {
    paddingHorizontal: 16,
    paddingVertical: 16,
    paddingBottom: 20, // Extra padding for better mobile experience
  },
  messageContainer: {
    marginVertical: 4,
    paddingHorizontal: 0,
    width: '100%',
  },
  sentMessageContainer: {
    alignItems: 'flex-end',
  },
  receivedMessageContainer: {
    alignItems: 'flex-start',
  },
  messageBubble: {
    maxWidth: '85%', // Increased for better mobile experience
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 20,
    marginBottom: 4,
    minWidth: 60, // Minimum width for small messages
  },
  messageBubbleLeft: {
    backgroundColor: '#D1D5DB', // gray-300
    borderTopLeftRadius: 4,
  },
  messageBubbleRight: {
    backgroundColor: '#3B82F6', // blue-500
    borderTopRightRadius: 4,
  },
  messageText: {
    fontSize: 16,
    lineHeight: 20,
  },
  sentText: {
    color: 'white', // white text on blue-500 background
  },
  receivedText: {
    color: '#000', // black text on gray-300 background
  },

  inputContainer: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: '#F5F5F5',
    borderTopWidth: 1,
    borderTopColor: '#E0E0E0',
    minHeight: 68,
  },
  adminNoticeContainer: {
    flex: 1,
    borderRadius: 20,
    paddingHorizontal: 16,
    paddingVertical: 10,
  },
  adminNoticeText: {
    fontSize: 13,
    textAlign: 'center',
  },
  inputWrapper: {
    flex: 1,
    borderWidth: 1,
    borderColor: '#D0D0D0',
    borderRadius: 20,
    backgroundColor: 'white',
    marginRight: 8,
  },
  textInput: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    fontSize: 16,
    color: '#000',
    minHeight: 44,
    maxHeight: 100,
  },
  sendButton: {
    backgroundColor: '#333',
    width: 44,
    height: 44,
    borderRadius: 22,
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  reportModal: {
    backgroundColor: 'white',
    borderRadius: 18,
    paddingBottom: 8,
    marginHorizontal: 16,
    maxHeight: '85%',
    minHeight: '60%',
    width: '92%',
    alignSelf: 'center',
    flexShrink: 1,
  },
  reportHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingTop: 24,
    paddingBottom: 16,
    backgroundColor: '#F7E1C8',
  },
  reportContent: {
    backgroundColor: 'white',
    borderRadius: 16,
    paddingHorizontal: 20,
    paddingVertical: 16,
    width: '92%',
    alignSelf: 'center',
  },
  reportTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#4B2E2B',
    textAlign: 'center',
    letterSpacing: 1.5,
    flex: 1,
  },
  reportScroll: {
    flex: 1,
  },
  reportScrollContent: {
    paddingBottom: 16,
    paddingTop: 4,
    flexGrow: 1,
  },
  reportSection: {
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#F1F1F1',
  },
  sectionLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#4B2E2B',
    marginBottom: 8,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  sectionHelper: {
    fontSize: 13,
    color: '#8A7B72',
    marginBottom: 12,
    lineHeight: 18,
  },
  reportOption: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    paddingVertical: 14,
    paddingHorizontal: 8,
    borderRadius: 12,
  },
  reportOptionSelected: {
    backgroundColor: '#FFF5EC',
  },
  checkbox: {
    width: 20,
    height: 20,
    borderWidth: 2,
    borderColor: '#ddd',
    borderRadius: 4,
    marginRight: 16,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 2,
  },
  checkboxSelected: {
    backgroundColor: '#007AFF',
    borderColor: '#007AFF',
  },
  reportTextContainer: {
    flex: 1,
  },
  reportTitleText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    marginBottom: 4,
  },
  reportDescription: {
    fontSize: 14,
    color: '#666',
    lineHeight: 20,
  },
  reportReason: {
    flex: 1,
    fontSize: 16,
    color: '#333',
    lineHeight: 20,
  },
  submitButton: {
    backgroundColor: '#F0C48A',
    paddingVertical: 16,
    paddingHorizontal: 32,
    borderRadius: 10,
    alignItems: 'center',
    marginHorizontal: 20,
    marginTop: 12,
    borderWidth: 1,
    borderColor: '#C48A4A',
  },
  submitButtonDisabled: {
    opacity: 0.5,
  },
  deleteCancelButton: {
    backgroundColor: '#F4C2C2',
    borderWidth: 1,
    borderColor: '#4B2E2B',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 10,
  },
  deleteCancelButtonText: {
    color: '#4B2E2B',
    fontWeight: '600',
  },
  deleteConfirmButton: {
    backgroundColor: '#FF6B9D',
    borderWidth: 1,
    borderColor: '#4B2E2B',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 10,
  },
  deleteConfirmButtonText: {
    color: '#fff',
    fontWeight: '700',
  },
  submitButtonText: {
    color: '#8B4513',
    textAlign: 'center',
    fontSize: 16,
    fontWeight: '600',
  },
  photoEvidenceSection: {
    borderBottomWidth: 0,
    paddingBottom: 24,
  },
  addPhotoButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderWidth: 2,
    borderColor: '#007AFF',
    borderStyle: 'dashed',
    borderRadius: 8,
    marginBottom: 12,
  },
  addPhotoText: {
    color: '#007AFF',
    fontSize: 16,
    fontWeight: '500',
    marginLeft: 8,
  },
  photosContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  photoItem: {
    position: 'relative',
  },
  photoPreview: {
    width: 80,
    height: 80,
    borderRadius: 8,
  },
  removePhotoButton: {
    position: 'absolute',
    top: -8,
    right: -8,
    backgroundColor: 'white',
    borderRadius: 10,
  },
  headerClose: {
    padding: 4,
  },
  sectionHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 6,
  },
  requiredHint: {
    fontSize: 12,
    color: '#B6463A',
    fontWeight: '600',
    textTransform: 'uppercase',
  },
  reportMessageInput: {
    minHeight: 90,
    borderWidth: 1,
    borderColor: '#E2D5CB',
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 14,
    color: '#3A2A23',
    backgroundColor: '#FFFDF9',
  },

  typingBubble: {
    minHeight: 40,
    justifyContent: 'center',
  },
  typingText: {
    fontSize: 14,
    color: '#666',
    fontStyle: 'italic',
  },
  typingDots: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 5,
  },
  typingDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#999',
    marginHorizontal: 2,
  },
  typingDot1: {
    opacity: 0.4,
  },
  typingDot2: {
    opacity: 0.6,
  },
  typingDot3: {
    opacity: 0.8,
  },
}); 