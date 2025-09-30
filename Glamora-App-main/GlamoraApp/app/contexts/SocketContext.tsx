import AsyncStorage from '@react-native-async-storage/async-storage';
import React, { createContext, useContext, useEffect, useRef, useState } from 'react';
import { io, Socket } from 'socket.io-client';

interface SocketContextType {
  socket: Socket | null;
  isConnected: boolean;
  sendMessage: (toUserId: string, message: string, productId?: string, productName?: string) => void;
  joinChat: (targetUserId: string) => void;
  leaveChat: (targetUserId: string) => void;
  sendTyping: (targetUserId: string, isTyping: boolean) => void;
  disconnectSocket: () => void;
}

const SocketContext = createContext<SocketContextType | undefined>(undefined);

export const SocketProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [socket, setSocket] = useState<Socket | null>(null);
  const [isConnected, setIsConnected] = useState(false);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const socketRef = useRef<Socket | null>(null);

  useEffect(() => {
    initializeSocket();
    return () => {
      if (socketRef.current) {
        console.log('🔌 Disconnecting socket on cleanup');
        socketRef.current.disconnect();
      }
    };
  }, []);

  const initializeSocket = async () => {
    try {
      const token = await AsyncStorage.getItem('token');
      const userData = await AsyncStorage.getItem('user');
      
      if (!token || !userData) {
        console.log('⚠️ No token or user data found, skipping socket connection');
        return;
      }

      const user = JSON.parse(userData);
      const userId = user.id || user._id || user.userId;
      setCurrentUserId(userId);

      console.log('🔌 Initializing Socket.IO connection...');
      console.log('👤 Current user data:', { user, userId });
      const newSocket = io('http://localhost:3000', {
        auth: { token },
        transports: ['websocket', 'polling'],
        forceNew: true
      });

      newSocket.on('connect', () => {
        console.log('✅ Connected to chat server:', newSocket.id);
        setIsConnected(true);
      });

      newSocket.on('disconnect', (reason) => {
        console.log('❌ Disconnected from chat server:', reason);
        setIsConnected(false);
      });

      newSocket.on('connect_error', (error) => {
        console.error('🔌 Socket connection error:', error);
        setIsConnected(false);
      });

      // Listen for incoming messages
      newSocket.on('new-message', (data) => {
        console.log('📨 Received new message:', data);
        // This will be handled by individual chat components
      });

      // Listen for typing indicators
      newSocket.on('user-typing', (data) => {
        console.log('✏️ User typing:', data);
        // This will be handled by individual chat components
      });

      // Listen for message confirmations
      newSocket.on('message-sent', (data) => {
        console.log('✅ Message sent confirmation:', data);
      });

      // Listen for message errors
      newSocket.on('message-error', (error) => {
        console.error('❌ Message error:', error);
      });

      setSocket(newSocket);
      socketRef.current = newSocket;

    } catch (error) {
      console.error('❌ Error initializing socket:', error);
    }
  };

  const sendMessage = (toUserId: string, message: string, productId?: string, productName?: string) => {
    console.log('🔍 SendMessage called:', { 
      socketExists: !!socket, 
      isConnected, 
      currentUserId, 
      socketConnected: socket?.connected 
    });
    
    if (socket && socket.connected && currentUserId) {
      console.log('📤 Sending message via Socket.IO:', { toUserId, message });
      socket.emit('private-message', {
        fromUserId: currentUserId,
        toUserId,
        message,
        timestamp: new Date().toISOString(),
        productId: productId || null,
        productName: productName || null
      });
    } else {
      console.warn('⚠️ Cannot send message - socket not connected', {
        socketExists: !!socket,
        socketConnected: socket?.connected,
        isConnected,
        currentUserId
      });
    }
  };

  const joinChat = (targetUserId: string) => {
    if (socket && socket.connected && currentUserId) {
      console.log('🏠 Joining chat room with user:', targetUserId);
      socket.emit('join-chat', {
        userId: currentUserId,
        targetUserId
      });
    }
  };

  const leaveChat = (targetUserId: string) => {
    if (socket && currentUserId) {
      console.log('🚪 Leaving chat room with user:', targetUserId);
      // Socket.IO automatically handles leaving rooms on disconnect
    }
  };

  const sendTyping = (targetUserId: string, isTyping: boolean) => {
    if (socket && socket.connected && currentUserId) {
      socket.emit('typing', {
        userId: currentUserId,
        targetUserId,
        isTyping
      });
    }
  };

  const disconnectSocket = () => {
    if (socket && socket.connected) {
      console.log('🔌 Manually disconnecting socket');
      socket.disconnect();
      setSocket(null);
      setIsConnected(false);
      setCurrentUserId(null);
    }
  };

  return (
    <SocketContext.Provider value={{
      socket,
      isConnected,
      sendMessage,
      joinChat,
      leaveChat,
      sendTyping,
      disconnectSocket
    }}>
      {children}
    </SocketContext.Provider>
  );
};

export const useSocket = () => {
  const context = useContext(SocketContext);
  if (!context) {
    throw new Error('useSocket must be used within SocketProvider');
  }
  return context;
};

// Add default export to fix the routing error
export default SocketProvider;
