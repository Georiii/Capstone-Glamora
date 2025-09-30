require('dotenv').config();
const express = require('express');
const cors = require('cors');
const mongoose = require('mongoose');

const app = express();

// Configure CORS for development
app.use(cors({
  origin: '*', // Allow all origins for development
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));

app.use(express.json());

const authRoutes = require('./routes/auth');
const wardrobeRoutes = require('./routes/wardrobe');
const chatRoutes = require('./routes/chat');
const reportRoutes = require('./routes/report');

app.use('/api/auth', authRoutes);
app.use('/api/wardrobe', wardrobeRoutes);
app.use('/api/chat', chatRoutes);
app.use('/api/report', reportRoutes);

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

app.listen(PORT, HOST, () => {
  console.log(`🚀 Server running on http://${HOST}:${PORT}`);
  console.log(`🌐 Health check: http://${HOST}:${PORT}/health`);
});
