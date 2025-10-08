import express from "express";
import { createServer } from "http";
import { Server } from "socket.io";
import cors from "cors";
import helmet from "helmet";
import rateLimit from "express-rate-limit";
import mongoose from "mongoose";
import dotenv from "dotenv";
import jwt from "jsonwebtoken";

// Import routes
import authRoutes from "./routes/auth.js";
import taskRoutes from "./routes/tasks.js";
import projectRoutes from "./routes/projects.js";
import documentRoutes from "./routes/documents.js";
import fileRoutes from "./routes/files.js";
import kanbanRoutes from "./routes/kanban.js";
import userRoutes from "./routes/users.js";
import analyticsRoutes from "./routes/analytics.js";
import settingsRoutes from "./routes/settings.js";
import subtaskRoutes from "./routes/subtasks.js";
import attachmentRoutes from "./routes/attachments.js";
import organizationRoutes from "./routes/organizations.js";
import teamRoutes from "./routes/teams.js";
import remiderRoutes from "./routes/accounts/remiderRoutes.js";
import reminderRoutes from "./routes/accounts/reminderRoutes.js";
// Import email routes
import emailRoutes from "./routes/email.js";
import notificationRoutes from "./routes/notifications.js";
import account from "./routes/accounts/accounts.js";

dotenv.config();
const app = express();

// Configure CORS with specific options
app.use(
  cors({
    origin:
      process.env.NODE_ENV === "production"
        ? process.env.FRONTEND_URL
        : ["http://localhost:3000", "http://127.0.0.1:3000"],
    credentials: true,
    methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization"],
  })
);

// Set proper MIME types for JavaScript modules
app.use((req, res, next) => {
  const jsExtensions = [".js", ".mjs", ".ts", ".tsx", ".jsx"];
  if (jsExtensions.some((ext) => req.url.endsWith(ext))) {
    res.type("application/javascript; charset=utf-8");
  }
  next();
});

// Validate critical environment variables
const requiredEnvVars = ["JWT_SECRET", "MONGODB_URI"];
const missingEnvVars = requiredEnvVars.filter((envVar) => !process.env[envVar]);

if (missingEnvVars.length > 0) {
  console.error("❌ Missing required environment variables:", missingEnvVars);
  console.error("💡 Please set these in your .env file or environment");
  process.exit(1);
}

// Use a consistent JWT secret with no fallback in production
const JWT_SECRET = process.env.JWT_SECRET;
if (process.env.NODE_ENV === "production" && JWT_SECRET === "fallback-secret") {
  console.error(
    "❌ Production environment detected but using fallback JWT secret!"
  );
  console.error("💡 Please set a secure JWT_SECRET environment variable");
  process.exit(1);
}

console.log("✅ Environment variables validated");
console.log(
  `🔐 JWT Secret: ${JWT_SECRET ? "Set" : "Missing"} (${JWT_SECRET?.substring(
    0,
    4
  )}...)`
);

const server = createServer(app);
const io = new Server(server, {
  cors: {
    origin: [
      process.env.CLIENT_URL ||
        "http://task-flow-ai.s3-website.ap-south-1.amazonaws.com",
      "http://localhost:5173", // Vite default
      "http://localhost:3000", // React default
      "http://localhost:3001", // Alternative React port
      "http://task-flow-ai.s3-website.ap-south-1.amazonaws.com", // Production URL
    ],
    credentials: true,
    methods: ["GET", "POST"],
  },
});

const PORT = process.env.PORT || 5000;

// Security middleware
app.use(helmet());
app.use(
  cors({
    origin: [
      process.env.CLIENT_URL ||
        "http://task-flow-ai.s3-website.ap-south-1.amazonaws.com",
      "http://localhost:5173", // Vite default
      "http://localhost:3000", // React default
      "http://localhost:3001", // Alternative React port
      "http://task-flow-ai.s3-website.ap-south-1.amazonaws.com", // Production URL
    ],
    credentials: true,
  })
);

// Rate limiting - more lenient for development
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: process.env.NODE_ENV === "production" ? 100 : 1000, // 1000 requests per 15 minutes in dev, 100 in production
  message: "Too many requests, please try again later.",
  standardHeaders: true, // Return rate limit info in the `RateLimit-*` headers
  legacyHeaders: false, // Disable the `X-RateLimit-*` headers
  skip: (req) => {
    // Skip rate limiting for authentication endpoints to allow quick retries
    return req.url.startsWith("/api/auth/");
  },
});
app.use(limiter);

// Body parsing middleware
app.use(express.json({ limit: "10mb" }));
app.use(express.urlencoded({ extended: true, limit: "10mb" }));

mongoose
  .connect(process.env.MONGODB_URI || "mongodb://localhost:27017/taskflow", {
    useNewUrlParser: true,
    useUnifiedTopology: true,
  })
  .then(() => console.log("✅ Connected to MongoDB"))
  .catch((error) => console.error("❌ MongoDB connection error:", error));

// Routes
app.use("/api/auth", authRoutes);
app.use("/api/tasks", taskRoutes);
app.use("/api/projects", projectRoutes);
app.use("/api/documents", documentRoutes);
app.use("/api/files", fileRoutes);
app.use("/api/kanban", kanbanRoutes);
app.use("/api/users", userRoutes);
app.use("/api/analytics", analyticsRoutes);
app.use("/api/settings", settingsRoutes);
app.use("/api/subtasks", subtaskRoutes);
app.use("/api/attachments", attachmentRoutes);
app.use("/api/organizations", organizationRoutes);
app.use("/api/teams", teamRoutes);
app.use("/api/email", emailRoutes);
app.use("/api/notifications", notificationRoutes);
app.use("/api/accounts", account);

app.use("/api/reminders", reminderRoutes);
app.use("/api/remider", remiderRoutes);
// Health check endpoint
app.get("/api/health", (req, res) => {
  res.json({ status: "OK", timestamp: new Date().toISOString() });
});

// Error handling middleware
app.use((error, req, res, next) => {
  console.error("Error:", error);
  res.status(error.status || 500).json({
    message: error.message || "Internal server error",
    ...(process.env.NODE_ENV === "development" && { stack: error.stack }),
  });
});

// 404 handler
app.use("*", (req, res) => {
  res.status(404).json({ message: "Route not found" });
});

// Socket.io authentication middleware
io.use((socket, next) => {
  const token = socket.handshake.auth.token;
  if (token) {
    jwt.verify(token, JWT_SECRET, (err, decoded) => {
      if (err) {
        console.error("Socket.io JWT verification failed:", err.message);
        return next(new Error("Authentication error"));
      }
      socket.userId = decoded.userId;
      next();
    });
  } else {
    next();
  }
});

// Socket.io connection handling
io.on("connection", (socket) => {
  //console.log(`User connected: ${socket.userId || 'anonymous'}`);

  // Join project room
  socket.on("join:project", (projectId) => {
    socket.join(`project:${projectId}`);
    //console.log(`User ${socket.userId} joined project ${projectId}`);
  });

  // Leave project room
  socket.on("leave:project", (projectId) => {
    socket.leave(`project:${projectId}`);
    //console.log(`User ${socket.userId} left project ${projectId}`);
  });

  // Join user room for personal notifications
  socket.join(`user:${socket.userId}`);

  // Join organization room for org-wide notifications
  socket.on("join:organization", (organizationId) => {
    socket.join(`organization:${organizationId}`);
    //console.log(`User ${socket.userId} joined organization ${organizationId}`);
  });

  socket.on("leave:organization", (organizationId) => {
    socket.leave(`organization:${organizationId}`);
    //console.log(`User ${socket.userId} left organization ${organizationId}`);
  });

  // Handle real-time task status changes
  socket.on("task:status:change", (data) => {
    const { taskId, newStatus, projectId } = data;
    if (projectId) {
      socket
        .to(`project:${projectId}`)
        .emit("task:updated", { taskId, status: newStatus });
    } else {
      socket.broadcast.emit("task:updated", { taskId, status: newStatus });
    }
  });

  socket.on("disconnect", () => {
    //console.log(`User disconnected: ${socket.userId || 'anonymous'}`);
  });
});

// Make io available to routes
app.set("io", io);

// Start server with graceful shutdown
const httpServer = server
  .listen(PORT, () => {
    console.log(`🚀 Server running on port ${PORT}`);
    // console.log(`📊 API Health Check: http://localhost:${PORT}/api/health`);
    console.log(`🌍 Environment: ${process.env.NODE_ENV}`);
    console.log(`🔌 WebSocket server ready`);
  })
  .on("error", (err) => {
    if (err.code === "EADDRINUSE") {
      console.error(`❌ Port ${PORT} is already in use.`);
      console.log(
        `💡 Try using a different port by setting PORT in your .env file`
      );
      console.log(`💡 Or stop the process using port ${PORT}:`);
      console.log(
        `   - Windows: netstat -ano | findstr :${PORT} then taskkill /PID <PID> /F`
      );
      console.log(`   - Linux/macOS: lsof -ti:${PORT} | xargs kill -9`);
      process.exit(1);
    } else {
      console.error("❌ Server error:", err);
      process.exit(1);
    }
  });

// Graceful shutdown
process.on("SIGTERM", () => {
  console.log("SIGTERM signal received: closing HTTP server");
  server.close(() => {
    console.log("HTTP server closed");
    mongoose.connection.close().then(() => {
      console.log("MongoDB connection closed");
      process.exit(0);
    });
  });
});

process.on("SIGINT", () => {
  console.log("SIGINT signal received: closing HTTP server");
  server.close(() => {
    console.log("HTTP server closed");
    mongoose.connection.close().then(() => {
      console.log("MongoDB connection closed");
      process.exit(0);
    });
  });
});
