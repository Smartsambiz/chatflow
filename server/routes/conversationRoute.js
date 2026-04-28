const express = require('express');
const router = express.Router();
const {
  getConversations,
  getMessages,
  sendMessage,
  getAiSuggestion,
} = require('../controllers/conversationController');
const protect  = require('../middleware/authMiddleware');

router.get('/', protect, getConversations);
router.post('/send', protect, sendMessage);
router.post('/ai-suggest', protect, getAiSuggestion)
router.get('/:customerId', protect, getMessages);


module.exports = router;