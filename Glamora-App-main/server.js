// Production deployment server
// This file serves both the backend API and admin dashboard
require('dotenv').config();
const express = require('express');
const http = require('http');
const cors = require('cors');
const mongoose = require('mongoose');
const socketIo = require('socket.io');
const path = require('path');

const app = express();
const server = http.createServer(app);

// Configure CORS for production
const allowedOrigins = [
  'https://your-mobile-app-domain.com', // Replace with your actual mobile app domain
  'https://your-render-domain.onrender.com', // Replace with your actual Render domain
  process.env.FRONTEND_URL || 'http://localhost:3000'
];

app.use(cors({
  origin: function (origin, callback) {
    // Allow requests with no origin (mobile apps, Postman, etc.)
    if (!origin) return callback(null, true);
    
    if (allowedOrigins.includes(origin)) {
      return callback(null, true);
    }
    
    const msg = 'The CORS policy for this site does not allow access from the specified Origin.';
    return callback(new Error(msg), false);
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Serve static files from admin-side directory
app.use('/admin', express.static(path.join(__dirname, 'admin-side')));

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({ 
    status: 'OK', 
    timestamp: new Date().toISOString(),
    environment: process.env.NODE_ENV || 'development'
  });
});

// Test endpoint
app.get('/test', (req, res) => {
  res.json({ message: 'Server is working!' });
});

// Import and use routes from backend (with error handling)
try {
  const authRoutes = require('./backend/routes/auth');
  const wardrobeRoutes = require('./backend/routes/wardrobe');
  const chatRoutes = require('./backend/routes/chat');
  const outfitsRoutes = require('./backend/routes/outfits');
  const recommendationsRoutes = require('./backend/routes/recommendations');
  const reportRoutes = require('./backend/routes/report');

  app.use('/api/auth', authRoutes);
  app.use('/api/wardrobe', wardrobeRoutes);
  app.use('/api/chat', chatRoutes);
  app.use('/api/outfits', outfitsRoutes);
  app.use('/api/recommendations', recommendationsRoutes);
  app.use('/api/report', reportRoutes);
  
  console.log('✅ All API routes loaded successfully');
} catch (error) {
  console.error('⚠️ Error loading some routes:', error.message);
  console.log('🔧 Server will continue with basic functionality');
}

// Socket.IO setup
const io = socketIo(server, {
  cors: {
    origin: allowedOrigins,
    methods: ["GET", "POST"],
    credentials: true
  }
});

// Socket.IO authentication middleware (optional)
io.use((socket, next) => {
  const token = socket.handshake.auth.token;
  // Allow connections without token for now
  next();
});

// Socket.IO connection handling
io.on('connection', (socket) => {
  console.log('User connected:', socket.id);
  
  socket.on('join-chat', (data) => {
    const { userId } = data;
    socket.join(`user_${userId}`);
    console.log(`User ${userId} joined their chat room`);
  });
  
  socket.on('send-message', (data) => {
    const { recipientId, message, senderId } = data;
    socket.to(`user_${recipientId}`).emit('new-message', {
      message,
      senderId,
      timestamp: new Date()
    });
  });
  
  socket.on('typing', (data) => {
    const { recipientId, isTyping, userId } = data;
    socket.to(`user_${recipientId}`).emit('user-typing', {
      isTyping,
      userId
    });
  });
  
  socket.on('disconnect', () => {
    console.log('User disconnected:', socket.id);
  });
});

// MongoDB connection (optional for deployment)
const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/glamora';

mongoose.connect(MONGODB_URI, {
  useNewUrlParser: true,
  useUnifiedTopology: true,
})
.then(() => {
  console.log('✅ Connected to MongoDB');
})
.catch((error) => {
  console.error('❌ MongoDB connection error:', error.message);
  console.log('🔧 Server will continue without database connection');
});

// Error handling middleware
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({ 
    message: 'Something went wrong!',
    error: process.env.NODE_ENV === 'development' ? err.message : 'Internal server error'
  });
});

// 404 handler
app.use((req, res) => {
  res.status(404).json({ message: 'Route not found' });
});

const PORT = process.env.PORT || 3000;

server.listen(PORT, () => {
  console.log(`🚀 Server running on port ${PORT}`);
  console.log(`📊 Admin dashboard: http://localhost:${PORT}/admin`);
  console.log(`🔗 API base URL: http://localhost:${PORT}/api`);
  console.log(`❤️  Health check: http://localhost:${PORT}/health`);
  console.log(`🧪 Test endpoint: http://localhost:${PORT}/test`);
});

module.exports = { app, server, io };