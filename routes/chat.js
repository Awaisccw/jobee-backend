const express = require('express');
const router = express.Router();
const Conversation = require('../models/Conversation');
const Message = require('../models/Message');
const { protect } = require('../middleware/authMiddleware');

// @route   POST /api/chat/conversations
// @desc    Create or get a conversation between current user and another user
router.post('/conversations', protect, async (req, res) => {
  const { recipientId } = req.body;
  if (!recipientId) return res.status(400).json({ message: 'Recipient ID is required' });

  try {
    // Check if conversation already exists
    let conversation = await Conversation.findOne({
      participants: { $all: [req.user._id, recipientId] }
    }).populate('participants', 'name profileImage email');

    if (!conversation) {
      conversation = new Conversation({
        participants: [req.user._id, recipientId]
      });
      await conversation.save();
      conversation = await conversation.populate('participants', 'name profileImage email');
    }

    res.status(200).json(conversation);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// @route   GET /api/chat/conversations
// @desc    Get all conversations for the current user
router.get('/conversations', protect, async (req, res) => {
  try {
    const conversations = await Conversation.find({
      participants: req.user._id
    })
    .populate('participants', 'name profileImage email role')
    .populate({
      path: 'lastMessage',
      select: 'content sender createdAt'
    })
    .sort({ updatedAt: -1 });

    res.status(200).json(conversations);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// @route   GET /api/chat/messages/:conversationId
// @desc    Get messages for a specific conversation
router.get('/messages/:conversationId', protect, async (req, res) => {
  try {
    const messages = await Message.find({
      conversationId: req.params.conversationId
    }).sort({ createdAt: 1 });

    res.status(200).json(messages);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// @route   POST /api/chat/messages
// @desc    Send a message in a conversation
router.post('/messages', protect, async (req, res) => {
  const { conversationId, content } = req.body;

  if (!conversationId || !content) {
    return res.status(400).json({ message: 'Conversation ID and content are required' });
  }

  try {
    const message = new Message({
      conversationId,
      sender: req.user._id,
      content
    });

    await message.save();

    // Update last message in conversation
    await Conversation.findByIdAndUpdate(conversationId, {
      lastMessage: message._id,
      updatedAt: Date.now()
    });

    res.status(201).json(message);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

module.exports = router;
