const express = require('express');
const jwt = require('jsonwebtoken');
const mongoose = require('mongoose');
const ChatMessage = require('../models/Chat');
const User = require('../models/User');
const Report = require('../models/Report');
const { JWT_SECRET } = require('../config/database');

const router = express.Router();

// Auth middleware
function auth(req, res, next) {
  const authHeader = req.headers.authorization;
  if (!authHeader) return res.status(401).json({ message: 'No token provided.' });
  const token = authHeader.split(' ')[1];
  if (!token) return res.status(401).json({ message: 'Invalid token.' });
  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    req.userId = decoded.userId;
    next();
  } catch (err) {
    res.status(401).json({ message: 'Invalid or expired token.' });
  }
}

// GET /api/chat/:userId - Get chat history with a specific user
router.get('/:userId', auth, async (req, res) => {
  try {
    const { userId } = req.params;
    const currentUserId = req.userId;

    // Find messages between current user and the other user
    const messages = await ChatMessage.find({
      $or: [
        { senderId: currentUserId, receiverId: userId },
        { senderId: userId, receiverId: currentUserId }
      ]
    })
    .sort({ timestamp: 1 })
    .populate('senderId', 'name email')
    .populate('receiverId', 'name email');

    res.json({ messages });
  } catch (err) {
    console.error('Error fetching chat messages:', err);
    res.status(500).json({ message: 'Failed to fetch messages.', error: err.message });
  }
});

// POST /api/chat/send - Send a message to a user
router.post('/send', auth, async (req, res) => {
  try {
    const { receiverId, text, productId, productName } = req.body;
    const senderId = req.userId;

    if (!receiverId || !text) {
      return res.status(400).json({ message: 'receiverId and text are required.' });
    }

    // Check if receiver exists
    const receiver = await User.findById(receiverId);
    if (!receiver) {
      return res.status(404).json({ message: 'Receiver not found.' });
    }

    const message = new ChatMessage({
      senderId,
      receiverId,
      text,
      productId,
      productName,
      timestamp: new Date(),
      read: false
    });

    await message.save();

    // Populate sender and receiver info for response
    await message.populate('senderId', 'name email');
    await message.populate('receiverId', 'name email');

    res.status(201).json({ message: 'Message sent successfully.', chatMessage: message });
  } catch (err) {
    console.error('Error sending message:', err);
    res.status(500).json({ message: 'Failed to send message.', error: err.message });
  }
});

// GET /api/chat/conversations - Get all conversations for current user
router.get('/conversations/list', auth, async (req, res) => {
  try {
    const currentUserId = req.userId;
    console.log('🔍 Current user ID:', currentUserId);
    console.log('🔍 Current user ID type:', typeof currentUserId);

    // Convert string ID to ObjectId
    const currentUserObjectId = new mongoose.Types.ObjectId(currentUserId);
    console.log('🔍 Converted to ObjectId:', currentUserObjectId);

    // Check if there are any messages for this user
    const totalMessages = await ChatMessage.countDocuments({
      $or: [
        { senderId: currentUserObjectId },
        { receiverId: currentUserObjectId }
      ]
    });
    console.log('📊 Total messages for user:', totalMessages);

    // Get all unique conversations
    const conversations = await ChatMessage.aggregate([
      {
        $match: {
          $or: [
            { senderId: currentUserObjectId },
            { receiverId: currentUserObjectId }
          ]
        }
      },
      {
        $group: {
          _id: {
            $cond: [
              { $eq: ['$senderId', currentUserObjectId] },
              '$receiverId',
              '$senderId'
            ]
          },
          lastMessage: { $last: '$$ROOT' },
          messageCount: { $sum: 1 },
          unreadCount: {
            $sum: {
              $cond: [
                { $and: [
                  { $eq: ['$receiverId', currentUserObjectId] },
                  { $eq: ['$read', false] }
                ]},
                1,
                0
              ]
            }
          }
        }
      },
      {
        $sort: { 'lastMessage.timestamp': -1 }
      }
    ]);

    console.log('📊 Raw conversations from aggregation:', conversations);

    // Populate user information for each conversation
    const populatedConversations = await Promise.all(
      conversations.map(async (conv) => {
        const user = await User.findById(conv._id).select('name email');
        return {
          ...conv,
          user: user
        };
      })
    );

    console.log('📊 Final conversations:', populatedConversations);
    res.json({ conversations: populatedConversations });
  } catch (err) {
    console.error('Error fetching conversations:', err);
    res.status(500).json({ message: 'Failed to fetch conversations.', error: err.message });
  }
});

// PUT /api/chat/mark-read - Mark messages as read
router.put('/mark-read/:userId', auth, async (req, res) => {
  try {
    const { userId } = req.params;
    const currentUserId = req.userId;

    await ChatMessage.updateMany(
      {
        senderId: userId,
        receiverId: currentUserId,
        read: false
      },
      {
        read: true
      }
    );

    res.json({ message: 'Messages marked as read.' });
  } catch (err) {
    console.error('Error marking messages as read:', err);
    res.status(500).json({ message: 'Failed to mark messages as read.', error: err.message });
  }
});

// DELETE /api/chat/conversations/:userId - Delete entire conversation with a user
router.delete('/conversations/:userId', auth, async (req, res) => {
  try {
    const { userId } = req.params; // The other user's ID
    const currentUserId = req.userId; // The current authenticated user's ID

    console.log(`🗑️ Deleting conversation between ${currentUserId} and ${userId}`);

    // Delete all messages where either user is sender/receiver
    const deleteResult = await ChatMessage.deleteMany({
      $or: [
        { senderId: currentUserId, receiverId: userId },
        { senderId: userId, receiverId: currentUserId }
      ]
    });

    if (deleteResult.deletedCount === 0) {
      console.log('⚠️ No messages found to delete');
      return res.status(404).json({ message: 'No conversation found to delete.' });
    }

    console.log(`✅ Deleted ${deleteResult.deletedCount} messages`);
    res.json({ message: 'Conversation deleted successfully.', deletedCount: deleteResult.deletedCount });
  } catch (err) {
    console.error('❌ Error deleting conversation:', err);
    res.status(500).json({ message: 'Failed to delete conversation.', error: err.message });
  }
});

module.exports = router; 