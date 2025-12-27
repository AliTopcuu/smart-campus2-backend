const { Server } = require("socket.io");
const { verifyAccessToken } = require("./utils/jwt");
const db = require("./models");

let io;

const initSocket = (server) => {
    io = new Server(server, {
        cors: {
            origin: [
                'http://localhost:5173',
                'http://localhost:5174',
                'http://localhost:5175',
                'http://127.0.0.1:5173',
                'http://127.0.0.1:5174',
                'http://127.0.0.1:5175',
                'https://smart-campus2-frontend-production.up.railway.app'
            ],
            methods: ["GET", "POST"],
            credentials: true
        }
    });

    // Authentication Middleware
    io.use(async (socket, next) => {
        try {
            // Client usually sends token in auth object: { token: "..." }
            // Or in Authorization header
            const token = socket.handshake.auth.token || socket.handshake.headers.authorization?.split(' ')[1];

            if (!token) {
                return next(new Error("Authentication error: Token required"));
            }

            const payload = verifyAccessToken(token);

            // Ensure user still exists
            const user = await db.User.findByPk(payload.sub);
            if (!user) {
                return next(new Error("Authentication error: User not found"));
            }

            // Attach user to socket
            socket.user = user;
            next();
        } catch (err) {
            console.error("Socket authentication failed:", err.message);
            next(new Error("Authentication error: Invalid or expired token"));
        }
    });

    io.on("connection", (socket) => {
        console.log(`🔌 WebSocket Connected: User ${socket.user.id} (${socket.user.email})`);

        // Join a room based on user ID for private notifications
        // Room name convention: "user_{id}"
        socket.join(`user_${socket.user.id}`);

        // Example: Join role-based rooms (e.g., "admin", "student")
        if (socket.user.role) {
            socket.join(`role_${socket.user.role}`);
        }

        socket.on("disconnect", () => {
            console.log(`🔌 WebSocket Disconnected: User ${socket.user.id}`);
        });
    });

    return io;
};

const getIO = () => {
    if (!io) {
        throw new Error("Socket.io not initialized!");
    }
    return io;
};

// Helper function to send notification to a specific user
const sendNotificationToUser = (userId, type, payload) => {
    const io = getIO();
    io.to(`user_${userId}`).emit('notification', {
        type,
        ...payload,
        timestamp: new Date()
    });
};

// Helper function to broadcast to all connected users
const broadcastNotification = (type, payload) => {
    const io = getIO();
    io.emit('notification', {
        type,
        ...payload,
        timestamp: new Date()
    });
};

module.exports = {
    initSocket,
    getIO,
    sendNotificationToUser,
    broadcastNotification
};
