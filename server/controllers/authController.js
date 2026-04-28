const User = require("../models/User");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");

//Helper function to create a token from user id
const generateToken = (userId)=>{
    return jwt.sign({id: userId}, process.env.JWT_SECRET, {expiresIn: '7d'});

}

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
    whatsappPhoneNumberId: user.whatsappPhoneNumberId,
    whatsappAccessToken: user.whatsappAccessToken,
});

//Register a new user
const register = async (req, res)=>{
    try {
        const {businessName, ownerName, email, password, phone} = req.body;

        //check all fields
        if(!businessName || !ownerName || !email || !password){
            return res.status(400).json({message: 'Please fill in all required fields'});
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
        let slug = businessName.toLowerCase().replace(/[a-z0-9]+/g, '-').replace(/^-|-$/g, '');

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
        const {email, password} = req.body;
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
        const {businessName, ownerName, phone, businessCategory, description, whatsappPhoneNumberId, whatsappAccessToken} = req.body;
        const user = await User.findByIdAndUpdate(
            req.user.id,
            {businessName, ownerName, phone, businessCategory, description, whatsappPhoneNumberId, whatsappAccessToken},
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

module.exports = {
    register,
    Login,
    getCurrentUser,
    updateProfile,
};