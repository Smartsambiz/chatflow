const dns = require('dns');
const express = require("express");
const cors = require("cors");
const dotenv = require("dotenv");
const http = require("http");
const path = require("path");
const {Server}= require("socket.io");
const connectDB = require("./config/db");
const securityHeaders = require("./middleware/securityHeaders");
const rateLimiter = require("./middleware/rateLimiter");
const { notFound, errorHandler } = require("./middleware/errorHandler");
const { getAllowedOrigins, isOriginAllowed, validateRequiredEnv } = require("./utils/env");

dns.setServers(["8.8.8.8", "8.8.4.4"]);

//Load environment variables
dotenv.config();
validateRequiredEnv();

const authRoutes = require("./routes/authRoute");
const webhookRoutes = require("./routes/webhookRoute");
const conversationRoute = require("./routes/conversationRoute");

//Connect to MongoDB
connectDB();

const app = express();
app.set('trust proxy', 1);

const server = http.createServer(app);
const allowedOrigins = getAllowedOrigins();
const corsOptions = {
    origin(origin, callback) {
        if (isOriginAllowed(origin, allowedOrigins)) {
            return callback(null, true);
        }

        return callback(new Error('Not allowed by CORS'));
    },
    credentials: true,
};

const io = new Server(server, {
    cors: {
        origin: allowedOrigins,
        credentials: true,
    }
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
app.use(securityHeaders);
app.use(cors(corsOptions));
app.use('/api/auth', rateLimiter({ windowMs: 15 * 60 * 1000, max: 80 }));
app.use('/api/conversations/send', rateLimiter({ windowMs: 60 * 1000, max: 30 }));
app.use('/api/conversations/send-image', express.json({ limit: '8mb' }));
app.use(express.json({ limit: '1mb' }));
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

//Routes
app.use('/api/auth', authRoutes);
app.use('/api/webhook', webhookRoutes);
app.use('/api/conversations', conversationRoute);

//Test route - just to confirm the server works
app.get('/', (req, res)=>{
    res.json({message: "Chatflow server is running"})
})

app.get('/health', (req, res) => {
    res.json({ status: 'ok', uptime: process.uptime() });
});

app.use(notFound);
app.use(errorHandler);

//start the server
const PORT = process.env.PORT || 5000;
server.listen(PORT, ()=>{
    console.log(`Server is running on port ${PORT}`);
})
