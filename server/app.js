const express = require("express");
const cors = require("cors");
const dotenv = require("dotenv");
const connectDB = require("./config/db");
const authRoutes = require("./routes/authRoute");
const webhookRoutes = require("./routes/webhookRoute");
const conversationRoute = require("./routes/conversationRoute");


//Load environment variables
dotenv.config();

//Connect to MongoDB
connectDB();

const app = express();

// Middleware 
app.use(cors());
app.use(express.json());

//Routes
app.use('/api/auth', authRoutes);
app.use('/api/webhook', webhookRoutes);
app.use('/api/conversations', conversationRoute);

//Test route - just to confirm the server works
app.get('/', (req, res)=>{
    res.json({message: "Chatflow server is running"})
})

//start the server
const PORT = process.env.PORT || 5000;
app.listen(PORT, ()=>{
    console.log(`Server is running on port ${PORT}`);
})