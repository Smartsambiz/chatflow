const Customer = require('../models/Customer');
const Message = require('../models/Message');
const User = require('../models/User');
const path = require('path');
const crypto = require('crypto');
const fs = require('fs/promises');
const { sendTextMessage, uploadImageMedia, sendImageMediaMessage } = require('../services/whatsappService');
const { generateReply } = require('../services/openai')
const { cancelAutoReply } = require('../services/autoReplyScheduler');

const IMAGE_MIME_EXTENSIONS = {
  'image/jpeg': 'jpg',
  'image/png': 'png',
  'image/webp': 'webp',
};

// GET /api/conversations — list all customers for this business
const getConversations = async (req, res) => {
  try {
    const customers = await Customer.find({ businessId: req.user.id })
      .sort({ lastMessageAt: -1 }) // most recent first
      .limit(50);

    res.json({ customers });
  } catch (error) {
    console.error('getConversations error:', error.message);
    res.status(500).json({ message: 'Server error' });
  }
};

// POST /api/conversations/send-image — upload and send an image to a customer
const sendImage = async (req, res) => {
  try {
    const { customerId, imageDataUrl, caption = '' } = req.body;

    if (!customerId || !imageDataUrl) {
      return res.status(400).json({ message: 'Customer and image are required' });
    }

    const imageMatch = String(imageDataUrl).match(/^data:(image\/(?:jpeg|png|webp));base64,(.+)$/);
    if (!imageMatch) {
      return res.status(400).json({ message: 'Please upload a JPG, PNG, or WebP image.' });
    }

    const [, mimeType, base64Data] = imageMatch;
    const imageBuffer = Buffer.from(base64Data, 'base64');
    const maxImageBytes = 5 * 1024 * 1024;

    if (imageBuffer.length > maxImageBytes) {
      return res.status(400).json({ message: 'Image is too large. Please upload an image under 5MB.' });
    }

    const customer = await Customer.findById(customerId);
    if (!customer) {
      return res.status(404).json({ message: 'Customer not found' });
    }

    cancelAutoReply(req.user.id, customer._id);

    const business = await User.findById(req.user.id);
    if (!business.whatsappPhoneNumberId || !business.whatsappAccessToken) {
      return res.status(400).json({
        message: 'WhatsApp not configured. Please add your Phone Number ID and Access Token in settings.',
      });
    }

    const extension = IMAGE_MIME_EXTENSIONS[mimeType];
    const filename = `${Date.now()}-${crypto.randomBytes(8).toString('hex')}.${extension}`;
    const uploadDir = path.join(__dirname, '..', 'uploads', 'chat-images');
    const uploadPath = path.join(uploadDir, filename);

    await fs.mkdir(uploadDir, { recursive: true });
    await fs.writeFile(uploadPath, imageBuffer);

    const mediaUpload = await uploadImageMedia(
      business.whatsappPhoneNumberId,
      business.whatsappAccessToken,
      imageBuffer,
      mimeType,
      filename
    );

    await sendImageMediaMessage(
      business.whatsappPhoneNumberId,
      business.whatsappAccessToken,
      customer.phone,
      mediaUpload.id,
      caption.trim()
    );

    const savedMessage = await Message.create({
      businessId: req.user.id,
      customerId: customer._id,
      direction: 'outbound',
      type: 'image',
      content: caption.trim(),
      mediaUrl: `/uploads/chat-images/${filename}`,
      mediaId: mediaUpload.id,
      status: 'sent',
      timestamp: new Date(),
    });

    res.json({
      message: 'Image sent successfully',
      data: savedMessage,
    });
  } catch (error) {
    console.error('sendImage error:', error.response?.data || error.message);
    res.status(500).json({ message: 'Failed to send image. Please try again.' });
  }
};

// GET /api/conversations/:customerId — get chat history
const getMessages = async (req, res) => {
  try {
    const messages = await Message.find({
      businessId: req.user.id,
      customerId: req.params.customerId,
    }).sort({ timestamp: 1 }); // oldest first

    res.json({ messages });
  } catch (error) {
    console.error('getMessages error:', error.message);
    res.status(500).json({ message: 'Server error' });
  }
};

// POST /api/conversations/send — send a message to a customer
const sendMessage = async (req, res) => {
  try {
    const { customerId, message } = req.body;
    console.log('sendMessage called with:', { customerId, message, userId: req.user.id });

    if (!customerId || !message) {
      console.log('Missing customerId or message');
      return res.status(400).json({ message: 'Customer and message are required' });
    }

    // Get the customer's phone number
    const customer = await Customer.findById(customerId);
    console.log('Customer found:', customer ? customer._id : 'null');
    if (!customer) {
      return res.status(404).json({ message: 'Customer not found' });
    }

    cancelAutoReply(req.user.id, customer._id);

    // Get the business WhatsApp credentials
    const business = await User.findById(req.user.id);
    console.log('Business WhatsApp config:', {
      phoneNumberId: business.whatsappPhoneNumberId,
      accessToken: business.whatsappAccessToken ? 'present' : 'missing'
    });
    if (!business.whatsappPhoneNumberId || !business.whatsappAccessToken) {
      return res.status(400).json({
        message: 'WhatsApp not configured. Please add your Phone Number ID and Access Token in settings.',
      });
    }

    // Send via WhatsApp API
    await sendTextMessage(
      business.whatsappPhoneNumberId,
      business.whatsappAccessToken,
      customer.phone,
      message
    );

    // Save the outbound message to database
    const savedMessage = await Message.create({
      businessId: req.user.id,
      customerId: customer._id,
      direction: 'outbound',
      type: 'text',
      content: message,
      status: 'sent',
      timestamp: new Date(),
    });

    res.json({
      message: 'Message sent successfully',
      data: savedMessage,
    });

  } catch (error) {
    console.error('sendMessage error:', error.message);

    // Handle specific WhatsApp API errors
    if (error.response && error.response.data) {
      const whatsappError = error.response.data;

      if (whatsappError.error) {
        if (whatsappError.error.code === 190 || whatsappError.error.message?.includes('expired')) {
          return res.status(400).json({
            message: 'Your WhatsApp access token has expired. Please generate a new access token from your WhatsApp Business API dashboard and update it in Settings.',
            error: 'TOKEN_EXPIRED'
          });
        }

        if (whatsappError.error.code === 100) {
          return res.status(400).json({
            message: 'Invalid WhatsApp Phone Number ID. Please check your configuration in Settings.',
            error: 'INVALID_PHONE_ID'
          });
        }
      }
    }

    // Generic error
    res.status(500).json({ message: 'Failed to send message. Please try again.' });
  }
};


const getAiSuggestion = async(req, res)=>{
  try{
    const {messageId } = req.body;

    const message = await Message.findById(messageId);
    if(!message){
      return res.status(404).json({message: 'Message not found'});

    }

    const business = await User.findById(req.user.id);

    const suggestion = await generateReply(message.content,{
      businessName: business.businessName,
      businessCategory: business.businessCategory,
      description: business.description,
      productsServices: business.productsServices,
      productImageUrls: business.productImageUrls,
      bankName: business.bankName,
      accountName: business.accountName,
      accountNumber: business.accountNumber,
    });

    if(!suggestion){
      return res.status(500).json({message: 'Could not generate suggestion'})
    }

    // Save fresh suggestion to message
    message.aiSuggestion = suggestion
    await message.save();

    res.json({ suggestion });
  } catch(error){
    console.log('getAiSuggestion error:', error.message);
    res.status(500).json({message: 'Server error'});
  }
}

module.exports = { getConversations, getMessages, sendMessage, sendImage, getAiSuggestion };
