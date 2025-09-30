import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useFocusEffect, useLocalSearchParams, useRouter } from 'expo-router';
import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  Alert,
  Image,
  Modal,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { API_ENDPOINTS } from '../config/api';
import { useSocket } from './contexts/SocketContext';

interface Message {
  id: string;
  text: string;
  senderId: string;
  senderName: string;
  senderAvatar: string;
  timestamp: Date;
  isFromCurrentUser: boolean;
}

export default function MessageUser() {
  const router = useRouter();
  const { sellerId, sellerEmail, productName, productImage } = useLocalSearchParams();
  const [messages, setMessages] = useState<Message[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [currentUser, setCurrentUser] = useState<any>(null);
  const [showReportModal, setShowReportModal] = useState(false);
  const [selectedReportReason, setSelectedReportReason] = useState('');
  const [otherUserTyping, setOtherUserTyping] = useState(false);
  const [otherUserId, setOtherUserId] = useState<string | null>(null);
  const scrollViewRef = useRef<ScrollView>(null);
  const typingTimeoutRef = useRef<any>(null);
  
  // Socket.IO context
  const { socket, isConnected, sendMessage: sendSocketMessage, joinChat, leaveChat, sendTyping } = useSocket();

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
      const response = await fetch(API_ENDPOINTS.getUser(sellerEmailStr), {
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });

      if (response.ok) {
        const sellerData = await response.json();
        const sellerUserId = sellerData.user._id;
        
        // Set the other user ID for Socket.IO
        setOtherUserId(sellerUserId);

        // Now get chat messages with the seller
        const chatResponse = await fetch(API_ENDPOINTS.chatMessages(sellerUserId), {
          headers: {
            'Authorization': `Bearer ${token}`,
          },
        });

        if (chatResponse.ok) {
          const data = await chatResponse.json();
          console.log('Loaded messages from API:', data.messages);

          // Transform the messages to match our Message interface
          const transformedMessages = (data.messages || []).map((msg: any) => ({
            id: msg._id,
            text: msg.text,
            senderId: msg.senderId._id || msg.senderId,
            senderName: msg.senderId.name || 'Unknown',
            senderAvatar: 'https://randomuser.me/api/portraits/men/32.jpg',
            timestamp: new Date(msg.timestamp),
            isFromCurrentUser: msg.senderId._id === currentUser.id || msg.senderId === currentUser.id
          }));
          setMessages(transformedMessages);
        } else {
          console.log('No messages found, setting default message');
          // If no messages exist, create initial message
          setMessages([{
            id: '1',
            text: 'Hello',
            senderId: sellerUserId,
            senderName: sellerId as string,
            senderAvatar: 'https://randomuser.me/api/portraits/men/32.jpg',
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
          senderAvatar: 'https://randomuser.me/api/portraits/men/32.jpg',
          timestamp: new Date(),
          isFromCurrentUser: false
        }]);
      }
    } catch (error) {
      console.error('Error loading messages:', error);
      // Set default message if API fails
      setMessages([{
        id: '1',
        text: 'Hello',
        senderId: sellerId as string,
        senderName: sellerId as string,
        senderAvatar: 'https://randomuser.me/api/portraits/men/32.jpg',
        timestamp: new Date(),
        isFromCurrentUser: false
      }]);
    }
  }, [sellerEmail, sellerId]);

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
          const newMsg: Message = {
            id: data._id || Date.now().toString(),
            text: data.message,
            senderId: data.fromUserId,
            senderName: data.senderName || (data.fromUserId === currentUser?.id ? 'You' : sellerId as string),
            senderAvatar: 'https://randomuser.me/api/portraits/men/32.jpg',
            timestamp: new Date(data.timestamp),
            isFromCurrentUser: data.fromUserId === currentUser?.id
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
  }, [socket, otherUserId, currentUser, sellerId, joinChat, leaveChat]);

  useEffect(() => {
    loadCurrentUser();
    loadMessages();
  }, [loadMessages]);

  // Reload messages when screen comes into focus
  useFocusEffect(
    useCallback(() => {
      loadMessages();
    }, [loadMessages])
  );

  const sendMessage = async () => {
    if (!newMessage.trim()) return;

    console.log('📝 Sending message:', newMessage.trim());
    const messageText = newMessage.trim();

    const message: Message = {
      id: Date.now().toString(),
      text: messageText,
      senderId: currentUser?.id || 'currentUser',
      senderName: currentUser?.name || 'You',
      senderAvatar: 'https://randomuser.me/api/portraits/men/32.jpg',
      timestamp: new Date(),
      isFromCurrentUser: true
    };

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
      sendSocketMessage(otherUserId, messageText, undefined, productName as string);
      
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
            text: newMessage.trim(),
            productName: productName,
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

  const submitReport = async () => {
    if (!selectedReportReason) {
      Alert.alert('Error', 'Please select a reason for reporting');
      return;
    }

    try {
      const token = await AsyncStorage.getItem('token');

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

        const response = await fetch(API_ENDPOINTS.report, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`,
          },
          body: JSON.stringify({
            reportedUserId: sellerUserId,
            reason: selectedReportReason,
          }),
        });

        if (response.ok) {
          Alert.alert('Success', 'Report submitted successfully');
          setShowReportModal(false);
          setSelectedReportReason('');
        } else {
          Alert.alert('Error', 'Failed to submit report');
        }
      } else {
        Alert.alert('Error', 'Failed to find user to report');
      }
    } catch (error) {
      console.error('Error submitting report:', error);
      Alert.alert('Error', 'Failed to submit report');
    }
  };

  const reportReasons = [
    'Seller scammed me by requesting payment outside the app and never shipped the item.',
    'Seller falsely claimed the item was authentic when it wasn\'t.',
    'Seller made inappropriate/unprofessional comments during the transaction.',
    'Seller used misleading pricing to bait users.',
    'Seller is using pressure tactics to rush payment outside safe channels.'
  ];

  const renderMessage = ({ item }: { item: Message }) => (
    <View style={[
      styles.messageContainer,
      item.isFromCurrentUser ? styles.sentMessage : styles.receivedMessage
    ]}>
      <View style={[
        styles.messageBubble,
        item.isFromCurrentUser ? styles.messageBubbleRight : styles.messageBubbleLeft
      ]}>
        <Text style={[
          styles.messageText,
          item.isFromCurrentUser ? styles.sentText : styles.receivedText
        ]}>
          {item.text}
        </Text>
        <View style={styles.messageFooter}>
          <Text style={styles.messageTime}>
            {item.timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
          </Text>
          {item.isFromCurrentUser && (
            <Ionicons 
              name="checkmark-done" 
              size={12} 
              color="#4CAF50" 
              style={styles.messageStatus}
            />
          )}
        </View>
      </View>
    </View>
  );

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()}>
          <Ionicons name="arrow-back" size={28} color="#000" />
        </TouchableOpacity>
        <View style={styles.headerCenter}>
          <Image
            source={{ uri: 'https://randomuser.me/api/portraits/men/32.jpg' }}
            style={styles.headerAvatar}
          />
          <Text style={styles.headerName}>{sellerId}</Text>
        </View>
        <View style={styles.headerActions}>
          <TouchableOpacity onPress={() => setShowReportModal(true)}>
            <Ionicons name="warning" size={24} color="#E74C3C" />
          </TouchableOpacity>
          <TouchableOpacity style={{ marginLeft: 10 }}>
            <Ionicons name="trash" size={24} color="#E74C3C" />
          </TouchableOpacity>
        </View>
      </View>

      {/* Product Info */}
      <View style={styles.productCard}>
        <Image source={{ uri: productImage as string }} style={styles.productImage} />
        <Text style={styles.productName}>{productName}</Text>
      </View>

      {/* Connection Status */}
      {socket && (
        <View style={[styles.connectionStatus, { backgroundColor: isConnected ? '#4CAF50' : '#FF9800' }]}>
          <Text style={styles.connectionStatusText}>
            {isConnected ? '🟢 Real-time chat active' : '🟡 Connecting...'}
          </Text>
        </View>
      )}

      {/* Chat Messages */}
      <ScrollView 
        ref={scrollViewRef}
        style={styles.chatArea} 
        contentContainerStyle={styles.chatContent}
        onContentSizeChange={() => scrollViewRef.current?.scrollToEnd({ animated: true })}
      >
        {messages.map((message) => renderMessage({ item: message }))}
        
        {/* Typing Indicator */}
        {otherUserTyping && (
          <View style={[styles.messageContainer, styles.receivedMessage]}>
            <View style={[styles.messageBubble, styles.messageBubbleLeft, styles.typingBubble]}>
              <Text style={styles.typingText}>Typing...</Text>
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
      <View style={styles.inputContainer}>
        <TextInput
          style={styles.textInput}
          placeholder="Write a message"
          value={newMessage}
          onChangeText={handleTextChange}
          multiline
        />
        <TouchableOpacity style={styles.sendButton} onPress={sendMessage}>
          <Ionicons name="paper-plane" size={20} color="#FFF" />
        </TouchableOpacity>
      </View>

      {/* Report Modal */}
      <Modal
        visible={showReportModal}
        transparent
        animationType="fade"
        onRequestClose={() => setShowReportModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.reportModal}>
            <View style={styles.reportHeader}>
              <Text style={styles.reportTitle}>Report user</Text>
              <TouchableOpacity onPress={() => setShowReportModal(false)}>
                <Ionicons name="close" size={24} color="#333" />
              </TouchableOpacity>
            </View>

            {reportReasons.map((reason, index) => (
              <TouchableOpacity
                key={index}
                style={styles.reportOption}
                onPress={() => setSelectedReportReason(reason)}
              >
                <View style={[
                  styles.checkbox,
                  selectedReportReason === reason && styles.checkboxSelected
                ]}>
                  {selectedReportReason === reason && (
                    <Ionicons name="checkmark" size={16} color="#FFF" />
                  )}
                </View>
                <Text style={styles.reportReason}>{reason}</Text>
              </TouchableOpacity>
            ))}

            <TouchableOpacity style={styles.submitButton} onPress={submitReport}>
              <Text style={styles.submitButtonText}>Submit</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FFF5F7',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 20,
    backgroundColor: '#FFF5F7',
    borderBottomWidth: 1,
    borderBottomColor: '#E5E5E5',
  },
  headerCenter: {
    alignItems: 'center',
  },
  headerAvatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    marginBottom: 4,
  },
  headerName: {
    fontSize: 14,
    fontWeight: '600',
    color: '#333',
  },
  headerActions: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  productCard: {
    backgroundColor: 'white',
    margin: 15,
    borderRadius: 12,
    padding: 15,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 3.84,
    elevation: 5,
  },
  productImage: {
    width: '100%',
    height: 200,
    borderRadius: 8,
    marginBottom: 10,
  },
  productName: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 5,
  },
  productPrice: {
    fontSize: 16,
    color: '#FF6B9D',
    fontWeight: 'bold',
  },
  chatArea: {
    flex: 1,
    paddingHorizontal: 15,
  },
  chatContent: {
    paddingVertical: 20,
  },
  messageContainer: {
    marginVertical: 5,
  },
  sentMessage: {
    alignItems: 'flex-end',
  },
  receivedMessage: {
    alignItems: 'flex-start',
  },
  messageAvatar: {
    width: 32,
    height: 32,
    borderRadius: 16,
    marginRight: 8,
  },
  messageBubble: {
    maxWidth: '80%',
    padding: 12,
    borderRadius: 18,
  },
  messageBubbleLeft: {
    backgroundColor: 'white',
    borderWidth: 1,
    borderColor: '#E5E5E5',
  },
  messageBubbleRight: {
    backgroundColor: '#FF6B9D',
  },
  messageText: {
    fontSize: 16,
  },
  sentText: {
    color: 'white',
  },
  receivedText: {
    color: '#333',
  },
  messageFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-end',
    marginTop: 5,
  },
  messageTime: {
    fontSize: 12,
    color: '#999',
    marginRight: 5,
  },
  messageStatus: {
    marginLeft: 2,
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 15,
    backgroundColor: 'white',
    borderTopWidth: 1,
    borderTopColor: '#E5E5E5',
  },
  textInput: {
    flex: 1,
    borderWidth: 1,
    borderColor: '#E5E5E5',
    borderRadius: 20,
    paddingHorizontal: 15,
    paddingVertical: 10,
    marginRight: 10,
    fontSize: 16,
  },
  sendButton: {
    backgroundColor: '#FF6B9D',
    width: 40,
    height: 40,
    borderRadius: 20,
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
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(246, 222, 222, 0.76)',
  },
  reportContent: {
    backgroundColor: 'white',
    borderRadius: 12,
    padding: 20,
    width: '80%',
    maxHeight: '70%',
  },
  reportHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },
  reportTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 15,
    textAlign: 'center',
  },
  reportOption: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 15,
  },
  checkbox: {
    width: 20,
    height: 20,
    borderRadius: 4,
    borderWidth: 2,
    borderColor: '#DDD',
    marginRight: 10,
    marginTop: 2,
    justifyContent: 'center',
    alignItems: 'center',
  },
  checkboxSelected: {
    backgroundColor: '#FFA500',
    borderColor: '#FFA500',
  },
  reportReason: {
    flex: 1,
    fontSize: 16,
    color: '#333',
    lineHeight: 20,
  },
  submitButton: {
    backgroundColor: '#FF6B9D',
    paddingVertical: 12,
    borderRadius: 8,
    marginTop: 15,
  },
  submitButtonText: {
    color: 'white',
    textAlign: 'center',
    fontSize: 16,
    fontWeight: 'bold',
  },
  // Socket.IO real-time styles
  connectionStatus: {
    paddingHorizontal: 15,
    paddingVertical: 8,
    alignItems: 'center',
  },
  connectionStatusText: {
    color: 'white',
    fontSize: 12,
    fontWeight: 'bold',
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