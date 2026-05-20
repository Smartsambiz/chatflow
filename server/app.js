const dns = require('dns');
const express = require("express");
const cors = require("cors");
const dotenv = require("dotenv");
const http = require("http");
const {Server}= require("socket.io");
const connectDB = require("./config/db");
const authRoutes = require("./routes/authRoute");
const webhookRoutes = require("./routes/webhookRoute");
const conversationRoute = require("./routes/conversationRoute");

dns.setServers(["8.8.8.8", "8.8.4.4"]);

//Load environment variables
dotenv.config();

//Connect to MongoDB
connectDB();

const app = express();
const server = http.createServer(app);
const io = new Server(server, {
    cors: { origin: "*" }
});

// Make io accessible to other files
app.set('io', io);

io.on("connection", (socket)=>{
    console.log("Client connected:", socket.id);

    socket.on("joinBusinessRoom", (businessId)=>{
        socket.join(businessId);
        console.log(`Client ${socket.id} joined room: ${businessId}`);
    });

    socket.on("disconnect", ()=>{
        console.log("Client disconnected:", socket.id);
    })
})
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
server.listen(PORT, ()=>{
    console.log(`Server is running on port ${PORT}`);
})