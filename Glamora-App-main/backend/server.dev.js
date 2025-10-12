require('dotenv').config();
const express = require('express');
const http = require('http');
const cors = require('cors');
const mongoose = require('mongoose');
const socketIo = require('socket.io');

const app = express();
const server = http.createServer(app);

// Configure CORS for development
app.use(cors({
  origin: '*', // Allow all origins for development
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));

app.use(express.json());

// Configure Socket.IO
const io = socketIo(server, {
  cors: {
    origin: "*", // Allow all origins for development
    methods: ["GET", "POST"],
    credentials: true
  }
});

// Socket.IO connection handling
io.on('connection', (socket) => {
  console.log('👤 User connected:', socket.id);

  // Join private chat room
  socket.on('join-chat', (data) => {
    const { userId, targetUserId } = data;
    const roomId = [userId, targetUserId].sort().join('-');
    socket.join(roomId);
    console.log(`💬 User ${userId} joined chat room: ${roomId}`);
  });

  // Handle private messages
  socket.on('private-message', async (data) => {
    try {
      const { fromUserId, toUserId, message, timestamp, productId, productName } = data;
      const roomId = [fromUserId, toUserId].sort().join('-');
      
      console.log(`📨 New message in room ${roomId}:`, message);
      
      // Save message to database using existing Chat model
      const ChatMessage = require('./models/Chat');
      const newMessage = new ChatMessage({
        senderId: fromUserId,
        receiverId: toUserId,
        text: message,
        productId: productId || null,
        productName: productName || null,
        timestamp: new Date(timestamp),
        read: false
      });
      
      const savedMessage = await newMessage.save();
      await savedMessage.populate('senderId', 'name email');
      await savedMessage.populate('receiverId', 'name email');
      
      console.log('✅ Message saved to database:', savedMessage._id);
      
      // Send message only to the receiver (not the sender)
      socket.to(roomId).emit('new-message', {
        _id: savedMessage._id,
        fromUserId,
        toUserId,
        message,
        timestamp,
        senderName: savedMessage.senderId.name,
        read: false
      });

      // Send confirmation to sender
      socket.emit('message-sent', {
        _id: savedMessage._id,
        timestamp: savedMessage.timestamp,
        message,
        toUserId
      });
      
    } catch (error) {
      console.error('❌ Error handling message:', error);
      socket.emit('message-error', { message: 'Failed to send message' });
    }
  });

  // Handle typing indicators
  socket.on('typing', (data) => {
    const { userId, targetUserId, isTyping } = data;
    const roomId = [userId, targetUserId].sort().join('-');
    
    // Send typing indicator to other user in the room
    socket.to(roomId).emit('user-typing', { 
      userId, 
      isTyping,
      timestamp: new Date()
    });
  });

  // Handle disconnect
  socket.on('disconnect', () => {
    console.log('👋 User disconnected:', socket.id);
  });
});

const authRoutes = require('./routes/auth');
const wardrobeRoutes = require('./routes/wardrobe-simple'); // Temporary: use simple version
const chatRoutes = require('./routes/chat');
const reportRoutes = require('./routes/report');
const outfitRoutes = require('./routes/outfits');
const recommendationRoutes = require('./routes/recommendations');
const weatherRoutes = require('./routes/weather');
const adminRoutes = require('../admin-side/admin-api');

app.use('/api/auth', authRoutes);
app.use('/api/wardrobe', wardrobeRoutes);
app.use('/api/chat', chatRoutes);
app.use('/api/report', reportRoutes);
app.use('/api/outfits', outfitRoutes);
app.use('/api/recommendations', recommendationRoutes);
app.use('/api/weather', weatherRoutes);
app.use('/api/admin', adminRoutes);

// Add error handling middleware AFTER routes
app.use((err, req, res, next) => {
  console.error('Error:', err);
  res.status(500).json({ message: 'Internal server error', error: err.message });
});

const mongoUri = 'mongodb+srv://2260086:0v2FuF3KYSV9Z2zV@glamoraapp.qje3nri.mongodb.net/?retryWrites=true&w=majority&appName=GlamoraApp';

mongoose.connect(mongoUri)
  .then(() => console.log('✅ MongoDB Atlas connected!'))
  .catch(err => console.error('❌ MongoDB connection error:', err));

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({ status: 'ok', message: 'Backend is running.', timestamp: new Date().toISOString() });
});

// Root endpoint
app.get('/', (req, res) => {
  res.json({ message: 'Glamora Backend API', version: '1.0.0' });
});

const PORT = process.env.PORT || 3000;
const HOST = process.env.HOST || '0.0.0.0';

server.listen(PORT, HOST, () => {
  console.log(`🚀 Server running on http://${HOST}:${PORT}`);
  console.log(`🌐 Health check: http://${HOST}:${PORT}/health`);
  console.log(`💬 Socket.IO chat ready!`);
});
