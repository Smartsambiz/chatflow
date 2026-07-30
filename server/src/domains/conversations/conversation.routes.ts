const express = require('express');
const router = express.Router();
const {
  getConversations,
  getMessages,
  sendMessage,
  sendImage,
  getAiSuggestion,
} = require('../controllers/conversationController');
const protect  = require('../middleware/authMiddleware');

router.get('/', protect, getConversations);
router.post('/send', protect, sendMessage);
router.post('/send-image', protect, sendImage);
router.post('/ai-suggest', protect, getAiSuggestion)
router.get('/:customerId', protect, getMessages);


module.exports = router;
