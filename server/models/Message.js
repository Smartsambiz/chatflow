const mongoose = require('mongoose');

const messageSchema = new mongoose.Schema({

    businessId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true,
    },
    customerId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Customer',

    },
    waMessageId: {
        type: String,
        unique: true,
        sparse: true,
    },
    direction: {
        type: String,
        enum: ['inbound', 'outbound'],
        required: true,
    },
    type: {
        type: String,
        enum: ['text', 'image', 'audio', 'document'],
        default: 'text',
    },
    content: {
        type: String,
        default: '',
    },
    mediaUrl: { 
        type: String,
        default: '',

    },
    mediaId: {
        type: String,
        default: '',
    },
    status: {
        type: String,
        enum: ['sent', 'delivered', 'read', 'failed'],
        default: 'sent',
    },
    aiSuggestion: {
        type: String,
        default: ''
    },
    timestamp: {
        type: Date,
        default: Date.now,
    }
}, {timestamps: true});

messageSchema.index({ waMessageId: 1 }, { unique: true, sparse: true });

const Message = mongoose.model('Message', messageSchema);
 
module.exports = Message;
