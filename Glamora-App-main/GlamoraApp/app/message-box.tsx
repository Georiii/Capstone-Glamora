import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useFocusEffect, useRouter } from 'expo-router';
import React, { useEffect, useState } from 'react';
import {
    ActivityIndicator,
    Alert,
    FlatList,
    Image,
    RefreshControl,
    StyleSheet,
    Text,
    TouchableOpacity,
    View,
} from 'react-native';
import { API_ENDPOINTS } from '../config/api';
import { useSocket } from './contexts/SocketContext';

interface Conversation {
  _id: string;
  user: {
    _id: string;
    name: string;
    email: string;
  };
  lastMessage: {
    text: string;
    timestamp: string;
    senderId: string;
  };
  messageCount: number;
  unreadCount: number;
}

export default function MessageBox() {
  const router = useRouter();
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [currentUser, setCurrentUser] = useState<any>(null);
  
  // Socket.IO context
  const { socket, isConnected } = useSocket();

  // Socket.IO effect for real-time updates
  useEffect(() => {
    if (socket && currentUser) {
      console.log('📱 Setting up real-time conversation updates');
      
      const handleNewMessage = (data: any) => {
        console.log('📨 New message for conversation list:', data);
        
        // Update conversation list when new message arrives
        setConversations(prevConversations => {
          const updatedConversations = [...prevConversations];
          
          // Find existing conversation
          const conversationIndex = updatedConversations.findIndex(conv => 
            conv.user._id === data.fromUserId || conv.user._id === data.toUserId
          );
          
          if (conversationIndex !== -1) {
            // Update existing conversation
            updatedConversations[conversationIndex] = {
              ...updatedConversations[conversationIndex],
              lastMessage: {
                text: data.message,
                timestamp: data.timestamp,
                senderId: data.fromUserId
              },
              unreadCount: data.fromUserId !== currentUser.id ? 
                updatedConversations[conversationIndex].unreadCount + 1 : 
                updatedConversations[conversationIndex].unreadCount
            };
            
            // Move to top
            const updatedConv = updatedConversations.splice(conversationIndex, 1)[0];
            return [updatedConv, ...updatedConversations];
          }
          
          return updatedConversations;
        });
      };
      
      socket.on('new-message', handleNewMessage);
      
      return () => {
        socket.off('new-message', handleNewMessage);
      };
    }
  }, [socket, currentUser]);

  useEffect(() => {
    loadCurrentUser();
    loadConversations();
  }, []);

  // Refresh conversations when screen comes into focus
  useFocusEffect(
    React.useCallback(() => {
      loadConversations();
    }, [])
  );

  const loadCurrentUser = async () => {
    try {
      const userData = await AsyncStorage.getItem('user');
      if (userData) {
        const user = JSON.parse(userData);
        setCurrentUser(user);
        console.log('👤 Current user loaded:', user.email);
      } else {
        console.log('❌ No user data found in AsyncStorage');
      }
    } catch (error) {
      console.error('Error loading current user:', error);
    }
  };

  const loadConversations = async (isRefresh = false) => {
    try {
      if (isRefresh) {
        setRefreshing(true);
      } else {
        setLoading(true);
      }
      
      const token = await AsyncStorage.getItem('token');
      
      if (!token) {
        console.log('❌ No token found in AsyncStorage');
        Alert.alert('Error', 'Please login to view messages');
        return;
      }

      console.log('🔍 Loading conversations...');
      console.log('🔑 Token:', token.substring(0, 20) + '...');
      
      // Add timeout to prevent hanging requests
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 10000); // 10 second timeout
      
      const response = await fetch(API_ENDPOINTS.chatConversations, {
        headers: {
          'Authorization': `Bearer ${token}`,
        },
        signal: controller.signal,
      });
      
      clearTimeout(timeoutId);

      console.log('📡 Response status:', response.status);
      console.log('📡 Response headers:', response.headers);

      if (response.ok) {
        const data = await response.json();
        console.log('📊 Raw API response:', JSON.stringify(data, null, 2));
        
        // Transform conversations to include proper user info
        const transformedConversations = (data.conversations || []).map((conv: any) => ({
          _id: conv._id,
          user: conv.user || { name: 'Unknown User', email: 'unknown@example.com' },
          lastMessage: {
            text: conv.lastMessage?.text || 'No message',
            timestamp: conv.lastMessage?.timestamp || new Date().toISOString(),
            senderId: conv.lastMessage?.senderId || 'unknown'
          },
          messageCount: conv.messageCount || 0,
          unreadCount: conv.unreadCount || 0
        }));
        
        console.log('✅ Transformed conversations:', JSON.stringify(transformedConversations, null, 2));
        setConversations(transformedConversations);
      } else {
        console.error('❌ Failed to load conversations:', response.status);
        const errorText = await response.text();
        console.error('❌ Error response text:', errorText);
        Alert.alert('Error', 'Failed to load conversations. Please try again.');
        setConversations([]);
      }
    } catch (error: any) {
      console.error('❌ Error loading conversations:', error);
      
      if (error?.name === 'AbortError') {
        Alert.alert('Timeout', 'Request timed out. Please check your connection and try again.');
      } else {
        Alert.alert('Error', 'Network error. Please check your connection.');
      }
      setConversations([]);
    } finally {
      if (isRefresh) {
        setRefreshing(false);
      } else {
        setLoading(false);
      }
    }
  };

  const onRefresh = () => {
    loadConversations(true);
  };

  const handleConversationPress = (conversation: Conversation) => {
    router.push({
      pathname: '/message-user',
      params: {
        sellerId: conversation.user._id,
        sellerEmail: conversation.user.email,
        productName: 'Conversation',
        productImage: 'https://randomuser.me/api/portraits/men/32.jpg'
      }
    });
  };

  const formatTimestamp = (timestamp: string) => {
    const date = new Date(timestamp);
    const now = new Date();
    const diffInHours = (now.getTime() - date.getTime()) / (1000 * 60 * 60);
    
    if (diffInHours < 24) {
      return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    } else if (diffInHours < 48) {
      return 'Yesterday';
    } else {
      return date.toLocaleDateString();
    }
  };

  const renderConversation = ({ item }: { item: Conversation }) => (
    <TouchableOpacity
      style={styles.conversationItem}
      onPress={() => handleConversationPress(item)}
    >
      <View style={styles.avatarContainer}>
        {item.user.name === 'Admin' ? (
          <View style={styles.adminIcon}>
            <Ionicons name="notifications" size={20} color="#666" />
          </View>
        ) : (
          <Image
            source={{ uri: 'https://randomuser.me/api/portraits/men/32.jpg' }}
            style={styles.avatar}
          />
        )}
      </View>
      
      <View style={styles.conversationContent}>
        <View style={styles.conversationHeader}>
          <Text style={styles.userName}>{item.user.name}</Text>
          <Text style={styles.timestamp}>
            {formatTimestamp(item.lastMessage.timestamp)}
          </Text>
        </View>
        
        <View style={styles.messagePreview}>
          <Text style={[
            styles.lastMessage, 
            item.unreadCount > 0 && styles.unreadMessage
          ]} numberOfLines={1}>
            {item.lastMessage.text}
          </Text>
          {item.unreadCount > 0 && (
            <View style={styles.unreadBadge}>
              <Text style={styles.unreadCount}>{item.unreadCount}</Text>
            </View>
          )}
        </View>
        
        {/* Message status indicator */}
        <View style={styles.messageStatus}>
          {item.lastMessage.senderId === currentUser?.id ? (
            <Ionicons name="checkmark-done" size={14} color="#4CAF50" />
          ) : null}
        </View>
      </View>
    </TouchableOpacity>
  );

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#FF6B9D" />
        <Text style={styles.loadingText}>Loading conversations...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => router.back()}
        >
          <Ionicons name="arrow-back" size={24} color="#333" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>MESSAGES</Text>
        <View style={styles.headerRight} />
      </View>

      {/* Real-time Connection Status */}
      {socket && (
        <View style={[styles.connectionStatus, { backgroundColor: isConnected ? '#4CAF50' : '#FF9800' }]}>
          <Text style={styles.connectionStatusText}>
            {isConnected ? '🟢 Real-time updates active' : '🟡 Connecting...'}
          </Text>
        </View>
      )}

      {/* Conversations List */}
      <FlatList
        data={conversations}
        renderItem={renderConversation}
        keyExtractor={(item) => item._id}
        style={styles.conversationsList}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            colors={['#FF6B9D']}
            tintColor="#FF6B9D"
          />
        }
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <Ionicons name="chatbubbles-outline" size={64} color="#ccc" />
            <Text style={styles.emptyTitle}>No conversations yet</Text>
            <Text style={styles.emptySubtitle}>
              Start messaging users from the marketplace!
            </Text>
          </View>
        }
      />
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
    paddingTop: 60,
    paddingBottom: 20,
    backgroundColor: '#F4C2C2',
  },
  backButton: {
    padding: 8,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
  },
  headerRight: {
    width: 40,
  },
  conversationsList: {
    flex: 1,
    paddingHorizontal: 20,
  },
  conversationItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 15,
    paddingHorizontal: 15,
    backgroundColor: 'white',
    borderRadius: 12,
    marginBottom: 10,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 3.84,
    elevation: 5,
  },
  avatarContainer: {
    marginRight: 15,
  },
  avatar: {
    width: 50,
    height: 50,
    borderRadius: 25,
  },
  adminIcon: {
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: 'white',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#eee',
  },
  conversationContent: {
    flex: 1,
  },
  conversationHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 5,
  },
  userName: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333',
  },
  timestamp: {
    fontSize: 12,
    color: '#999',
  },
  messagePreview: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  lastMessage: {
    fontSize: 14,
    color: '#666',
    flex: 1,
  },
  unreadBadge: {
    backgroundColor: '#FF6B9D',
    borderRadius: 10,
    minWidth: 20,
    height: 20,
    justifyContent: 'center',
    alignItems: 'center',
    marginLeft: 10,
  },
  unreadCount: {
    color: 'white',
    fontSize: 12,
    fontWeight: 'bold',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#F4C2C2',
  },
  loadingText: {
    marginTop: 10,
    fontSize: 16,
    color: '#666',
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 60,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
    marginTop: 20,
    marginBottom: 10,
  },
  emptySubtitle: {
    fontSize: 14,
    color: '#666',
    textAlign: 'center',
    paddingHorizontal: 40,
  },
  unreadMessage: {
    fontWeight: 'bold',
    color: '#FF6B9D',
  },
  messageStatus: {
    position: 'absolute',
    top: 0,
    right: 0,
    marginTop: 5,
    marginRight: 5,
  },
  // Real-time connection status
  connectionStatus: {
    paddingHorizontal: 15,
    paddingVertical: 6,
    alignItems: 'center',
  },
  connectionStatusText: {
    color: 'white',
    fontSize: 11,
    fontWeight: 'bold',
  },
}); 