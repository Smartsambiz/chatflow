const mongoose = require('mongoose');

const messageSchema = new mongoose.Schema({
    businessId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true,
    }, 
    name: {
        type: String,
        default: 'Unknown',
        trim: true,
    }, 
    phone: {
        type: String, 
        required: true, 
        trim: true,
    },
    tags: {
        type: [String],
        default: [],
    },
    totalOrder: {
        type: Number,
        default: 0,
    },
    totalSpent: {
        type: Number,
        default: 0,
    },
    lastMessageAt: {
        type: Date,
        default: Date.now,
    }, 
    status: {
        type: String, 
        enum : ['lead', 'active', 'inactive'],
        default: 'lead',
    },
    referralCode: {
        type: String, 
        unique: true,
        sparse: true,
    },
    referredBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Customer',
    }, 
    notes: {
        type: String,
        default: '',
    }
}, {timestamps: true}
);

const Customer = mongoose.model('Customer', messageSchema);

module.exports = Customer;