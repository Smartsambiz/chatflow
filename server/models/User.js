const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const userSchema = new mongoose.Schema({
    businessName: {
        type: String,
        required: [true, 'Business name is required'],
        trim: true,
    },
    ownerName: {
        type: String,
        required: [true, 'Owner name is required'],
        trim: true,
    },
    email: {
        type: String,
        required: [true, 'Email is required'],
        unique: true,
        lowercase: true,
        trim: true,
    },
    passwordHash: {
        type: String,
        required: [true, 'Password is required'],
    },
    phone: {
        type: String,
        trim: true,
    },
    whatsappPhoneNumberId: {
        type: String,
        default: '',

    },
    whatsappAccessToken: {
        type: String,
        default: '',
    },
    plan: {
        type: String,
        enum: ['free', 'starter', 'pro'],
        default: 'free',
    },
    slug : {
        type: String,
        unique: true,
        lowercase: true,
        trim: true,
    },
    logourl: {
        type: String,
        default: '',
    },
    businessCategory: {
        type: String,
        default: '',
        },
    description: {
        type: String,
        default: '',
    }, 
    productsServices: {
        type: String,
        default: '',
    },
    productImageUrls: {
        type: [String],
        default: [],
    },
    bankName: {
        type: String,
        default: '',
    },
    accountName: {
        type: String,
        default: '',
    },
    accountNumber: {
        type: String,
        default: '',
    },
    autoReplyEnabled: {
        type: Boolean,
        default: true,
    },
    autoReplyDelaySeconds: {
        type: Number,
        default: 30,
        min: 5,
        max: 300,
    },
    isActive: {
        type: Boolean,
        default: true,
    }
}, {timestamps: true});

const User = mongoose.model('User', userSchema);
module.exports = User;
