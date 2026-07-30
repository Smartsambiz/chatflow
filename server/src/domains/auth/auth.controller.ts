const User = require("../models/User");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const { getPhoneNumberInfo } = require("../services/whatsappService");

//Helper function to create a token from user id
const generateToken = (userId)=>{
    return jwt.sign({id: userId}, process.env.JWT_SECRET, {expiresIn: '7d'});

}

const normalizeEmail = (email) => String(email || '').trim().toLowerCase();

const normalizeProductImageUrls = (productImageUrls) => (
    Array.isArray(productImageUrls)
        ? productImageUrls
        : String(productImageUrls || '').split('\n')
)
    .map((url) => String(url).trim())
    .filter(Boolean)
    .slice(0, 20);

const makeSlug = (businessName) => (
    String(businessName || '')
        .trim()
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/^-|-$/g, '')
        || `business-${Date.now()}`
);

const pruneUndefined = (value) => (
    Object.fromEntries(Object.entries(value).filter(([, item]) => item !== undefined))
);

//Helper functio to check what user data to send back
const sanitizeUser = (user)=>({
    _id: user._id,
    businessName: user.businessName,
    ownerName: user.ownerName,
    email: user.email,
    phone: user.phone,
    plan: user.plan,
    slug: user.slug,
    logourl: user.logourl,
    businessCategory: user.businessCategory,
    description: user.description,
    productsServices: user.productsServices,
    productImageUrls: user.productImageUrls,
    bankName: user.bankName,
    accountName: user.accountName,
    accountNumber: user.accountNumber,
    autoReplyEnabled: user.autoReplyEnabled,
    autoReplyDelaySeconds: user.autoReplyDelaySeconds,
    whatsappPhoneNumberId: user.whatsappPhoneNumberId,
    whatsappAccessTokenConfigured: Boolean(user.whatsappAccessToken),
});

//Register a new user
const register = async (req, res)=>{
    try {
        const {
            businessName,
            ownerName,
            email: rawEmail,
            password,
            phone,
            businessCategory,
            description,
            productsServices,
            productImageUrls,
            bankName,
            accountName,
            accountNumber,
        } = req.body;

        //check all fields
        const email = normalizeEmail(rawEmail);

        if(!businessName || !ownerName || !email || !password){
            return res.status(400).json({message: 'Please fill in all required fields'});
        }

        if(password.length < 8){
            return res.status(400).json({message: 'Password must be at least 8 characters long'});
        }

        // check if email already exists
        const existingUser = await User.findOne({email});
        if(existingUser){
            return res.status(400).json({message: "An account with this email already exists"});
        }

        //hash the password
        const salt = await bcrypt.genSalt(10);
        const passwordHash = await bcrypt.hash(password, salt);

        // create a unique slug for the business name
        let slug = makeSlug(businessName);

        // make slug unique if it already exists
        const existingSlug = await User.findOne({slug});
        if(existingSlug){
            slug = `${slug}-${Date.now()}`;
        }

        // create the user
        const user = await User.create({
            businessName,
            ownerName,
            email,
            passwordHash,
            phone,
            slug,
            businessCategory,
            description,
            productsServices,
            productImageUrls: normalizeProductImageUrls(productImageUrls),
            bankName,
            accountName,
            accountNumber,
        });

        //generate a token and respond
        const token = generateToken(user._id);
        res.status(201).json({
            message: 'User registered successfully',
            token,
            user: sanitizeUser(user),
        })
    } catch (error) {
        console.error('Error in register controller:', error);
        res.status(500).json({message: 'Server error'});
    }
};

//Login an existing user
const Login = async (req, res)=>{
    try {
        const {email: rawEmail, password} = req.body;
        const email = normalizeEmail(rawEmail);
        //check all fields
        if(!email || !password){
            return res.status(400).json({message: 'Please fill in all required fields'});
        }

        //find the user by email
        const user = await User.findOne({email});
        if(!user){
            return res.status(400).json({message: 'Invalid email or password'});
        }

        //check the password
        const isMatch = await bcrypt.compare(password, user.passwordHash);
        if(!isMatch){
            return res.status(400).json({message: 'Invalid email or password'});
        }

        //generate a token and respond
        const token = generateToken(user._id);
        res.status(200).json({
            message: 'Login successful',
            token,
            user: sanitizeUser(user),
        })
    } catch (error) {
        console.error('Error in login controller:', error);
        res.status(500).json({message: 'Server error'});

    }
};

// Get current user
const getCurrentUser = async (req, res)=>{
    try {
         
        const user = await User.findById(req.user.id);
        if(!user){
            return res.status(404).json({message: 'User not found'});
        }
        res.status(200).json({
            message: 'User found',
            user: sanitizeUser(user),
        })
    } catch (error) {
        console.error('Error in get current user controller:', error);
        res.status(500).json({message: 'Server error'});
    }
};


// update profile
const updateProfile = async (req, res)=>{
    try {
        const {
            businessName,
            ownerName,
            phone,
            businessCategory,
            description,
            productsServices,
            productImageUrls,
            bankName,
            accountName,
            accountNumber,
            autoReplyEnabled,
            autoReplyDelaySeconds,
            whatsappPhoneNumberId,
            whatsappAccessToken,
        } = req.body;
        const normalizedProductImageUrls = normalizeProductImageUrls(productImageUrls);
        if (!businessName || !ownerName) {
            return res.status(400).json({message: 'Business name and owner name are required'});
        }

        const delay = Math.min(Math.max(Number(autoReplyDelaySeconds) || 30, 5), 300);

        const update = pruneUndefined({
            businessName,
            ownerName,
            phone,
            businessCategory,
            description,
            productsServices,
            productImageUrls: normalizedProductImageUrls,
            bankName,
            accountName,
            accountNumber,
            autoReplyEnabled: typeof autoReplyEnabled === 'boolean' ? autoReplyEnabled : undefined,
            autoReplyDelaySeconds: delay,
            whatsappPhoneNumberId,
        });

        if (typeof whatsappAccessToken === 'string' && whatsappAccessToken.trim()) {
            update.whatsappAccessToken = whatsappAccessToken.trim();
        }

        const user = await User.findByIdAndUpdate(
            req.user.id,
            update,
            {new: true, runValidators: true}
        );

        if(!user){
            return res.status(404).json({message: 'User not found'});
        }

        res.status(200).json({
            message: 'Profile updated successfully',
            user: sanitizeUser(user),
        });
    } catch (error) {
        console.error('Error in update profile controller:', error);
        res.status(500).json({message: 'Server error'});
    }
};

const describeWhatsappError = (error) => {
    const whatsappError = error.response?.data?.error;
    const message = String(whatsappError?.message || error.message || '');
    const code = whatsappError?.code;

    if (code === 190 || message.toLowerCase().includes('token')) {
        return 'The access token is invalid or expired. Generate a fresh token in Meta and paste it here.';
    }

    if (code === 100 || message.toLowerCase().includes('unsupported get request')) {
        return 'The Phone Number ID was not found. Check that you copied the Phone Number ID, not the phone number itself.';
    }

    if (error.response?.status === 403) {
        return 'This token does not have permission to access that WhatsApp number.';
    }

    return 'Could not verify WhatsApp right now. Please check the details and try again.';
};

const testWhatsappConnection = async (req, res) => {
    try {
        const user = await User.findById(req.user.id);
        if (!user) {
            return res.status(404).json({ message: 'User not found' });
        }

        const phoneNumberId = String(req.body.whatsappPhoneNumberId || user.whatsappPhoneNumberId || '').trim();
        const accessToken = String(req.body.whatsappAccessToken || user.whatsappAccessToken || '').trim();

        if (!phoneNumberId || !accessToken) {
            return res.status(400).json({
                connected: false,
                message: 'Add both the Phone Number ID and Access Token before testing.',
            });
        }

        const phoneInfo = await getPhoneNumberInfo(phoneNumberId, accessToken);

        res.json({
            connected: true,
            message: 'WhatsApp connection verified.',
            phoneNumber: {
                id: phoneNumberId,
                displayPhoneNumber: phoneInfo.display_phone_number,
                verifiedName: phoneInfo.verified_name,
                qualityRating: phoneInfo.quality_rating,
                platformType: phoneInfo.platform_type,
            },
        });
    } catch (error) {
        res.status(400).json({
            connected: false,
            message: describeWhatsappError(error),
        });
    }
};

module.exports = {
    register,
    Login,
    getCurrentUser,
    updateProfile,
    testWhatsappConnection,
};
