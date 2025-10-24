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

app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ limit: '50mb', extended: true }));

// Serve static files from uploads directory
app.use('/uploads', express.static('uploads'));

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
// Use full wardrobe routes so marketplace endpoints are available
const wardrobeRoutes = require('./routes/wardrobe');
const chatRoutes = require('./routes/chat');
const reportRoutes = require('./routes/report');
const outfitRoutes = require('./routes/outfits');
const recommendationRoutes = require('./routes/recommendations');
const weatherRoutes = require('./routes/weather');
const clothingUsageRoutes = require('./routes/clothing-usage');

// Admin routes - conditionally load if file exists (for deployment compatibility)
let adminRoutes;
try {
  adminRoutes = require('../../admin-side/admin-api');
} catch (err) {
  console.log('ℹ️  Admin routes not available (admin-api.js not found). Admin dashboard will not be accessible.');
  adminRoutes = null;
}

app.use('/api/auth', authRoutes);
app.use('/api/wardrobe', wardrobeRoutes);
app.use('/api/chat', chatRoutes);
app.use('/api/report', reportRoutes);
app.use('/api/outfits', outfitRoutes);
app.use('/api/recommendations', recommendationRoutes);
app.use('/api/weather', weatherRoutes);
app.use('/api/clothing-usage', clothingUsageRoutes);
if (adminRoutes) {
  app.use('/api/admin', adminRoutes);
}

// Password reset redirect page
app.get('/reset-password-redirect', (req, res) => {
  const { token } = req.query;
  
  if (!token) {
    return res.status(400).send('Invalid reset link: No token provided');
  }
  
  // HTML page that redirects to the app
  res.send(`
    <!DOCTYPE html>
    <html lang="en">
    <head>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>Glamora - Reset Password</title>
      <style>
        * {
          margin: 0;
          padding: 0;
          box-sizing: border-box;
        }
        body {
          font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
          background: linear-gradient(135deg, #F4C2C2 0%, #FFE8C8 100%);
          min-height: 100vh;
          display: flex;
          justify-content: center;
          align-items: center;
          padding: 20px;
        }
        .container {
          background: white;
          border-radius: 20px;
          box-shadow: 0 10px 40px rgba(0, 0, 0, 0.1);
          padding: 40px;
          max-width: 500px;
          width: 100%;
          text-align: center;
        }
        .logo {
          font-size: 48px;
          margin-bottom: 20px;
        }
        h1 {
          color: #4B2E2B;
          margin-bottom: 20px;
          font-size: 28px;
        }
        p {
          color: #666;
          line-height: 1.6;
          margin-bottom: 15px;
        }
        .button {
          display: inline-block;
          background-color: #FFE8C8;
          color: #4B2E2B;
          padding: 15px 40px;
          border-radius: 25px;
          text-decoration: none;
          font-weight: bold;
          margin: 20px 0;
          transition: all 0.3s ease;
          border: 2px solid #4B2E2B;
        }
        .button:hover {
          background-color: #ffd9a8;
          transform: translateY(-2px);
          box-shadow: 0 5px 15px rgba(0, 0, 0, 0.2);
        }
        .instructions {
          background-color: #f9f9f9;
          padding: 20px;
          border-radius: 10px;
          margin: 20px 0;
          text-align: left;
        }
        .instructions h3 {
          color: #4B2E2B;
          margin-bottom: 10px;
          font-size: 16px;
        }
        .instructions ol {
          margin-left: 20px;
          color: #666;
        }
        .instructions li {
          margin: 8px 0;
        }
        .spinner {
          border: 4px solid #f3f3f3;
          border-top: 4px solid #FFE8C8;
          border-radius: 50%;
          width: 40px;
          height: 40px;
          animation: spin 1s linear infinite;
          margin: 20px auto;
        }
        @keyframes spin {
          0% { transform: rotate(0deg); }
          100% { transform: rotate(360deg); }
        }
        .status {
          margin: 20px 0;
          padding: 15px;
          border-radius: 10px;
          font-weight: bold;
        }
        .status.success {
          background-color: #d4edda;
          color: #155724;
        }
        .status.error {
          background-color: #f8d7da;
          color: #721c24;
        }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="logo">🌟</div>
        <h1>Glamora Password Reset</h1>
        <p>Click the button below to open the Glamora app and reset your password.</p>
        
        <a href="glamora://reset-password?token=${token}" class="button" id="openAppBtn">
          Open Glamora App
        </a>
        
        <div class="instructions">
          <h3>📱 Instructions:</h3>
          <ol>
            <li>Make sure the Glamora app is installed and running on your device</li>
            <li>Click the "Open Glamora App" button above</li>
            <li>If prompted, allow the browser to open the app</li>
            <li>Enter your new password in the app</li>
          </ol>
        </div>
        
        <p style="font-size: 14px; color: #999; margin-top: 20px;">
          This link will expire in 1 hour for security reasons.
        </p>
        
        <div id="status"></div>
      </div>
      
      <script>
        // Automatically try to open the app
        setTimeout(() => {
          window.location.href = 'http://localhost:8081/reset-password?token=${token}';
        }, 500);
      </script>
    </body>
    </html>
  `);
});

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

const PORT = process.env.PORT || 5000;
const HOST = process.env.HOST || '0.0.0.0';

server.listen(PORT, HOST, () => {
  console.log(`🚀 Server running on http://${HOST === '0.0.0.0' ? 'glamora-g5my.onrender.com' : HOST}:${PORT}`);
  console.log(`🌐 Health check: http://${HOST === '0.0.0.0' ? 'glamora-g5my.onrender.com' : HOST}:${PORT}/health`);
  console.log(`💬 Socket.IO chat ready!`);
});

