import express from 'express';
import { createServer } from 'http';
import { Server } from 'socket.io';
import cors from 'cors';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import mongoose from 'mongoose';
import dotenv from 'dotenv';
import jwt from 'jsonwebtoken';

// Import routes
import authRoutes from './routes/auth.js';
import taskRoutes from './routes/tasks.js';
import projectRoutes from './routes/projects.js';
import documentRoutes from './routes/documents.js';
import fileRoutes from './routes/files.js';
import kanbanRoutes from './routes/kanban.js';
import userRoutes from './routes/users.js';
import analyticsRoutes from './routes/analytics.js';
import settingsRoutes from './routes/settings.js';
import subtaskRoutes from './routes/subtasks.js';
import attachmentRoutes from './routes/attachments.js';

dotenv.config();

const app = express();
const server = createServer(app);
const io = new Server(server, {
  cors: {
    origin: [
      process.env.CLIENT_URL || 'http://localhost:3000',
      'http://localhost:5173', // Vite default
      'http://localhost:3000', // React default
      'http://localhost:3001', // Alternative React port
    ],
    credentials: true,
    methods: ['GET', 'POST'],
  },
});

const PORT = process.env.PORT || 5000;

// Security middleware
app.use(helmet());
app.use(cors({
  origin: [
    process.env.CLIENT_URL || 'http://localhost:3000',
    'http://localhost:5173', // Vite default
    'http://localhost:3000', // React default
    'http://localhost:3001', // Alternative React port
  ],
  credentials: true,
}));

// Rate limiting - more lenient for development
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: process.env.NODE_ENV === 'production' ? 100 : 1000, // 1000 requests per 15 minutes in dev, 100 in production
  message: 'Too many requests, please try again later.',
  standardHeaders: true, // Return rate limit info in the `RateLimit-*` headers
  legacyHeaders: false, // Disable the `X-RateLimit-*` headers
  skip: (req) => {
    // Skip rate limiting for authentication endpoints to allow quick retries
    return req.url.startsWith('/api/auth/');
  },
});
app.use(limiter);

// Body parsing middleware
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Connect to MongoDB
// ...existing code...
// Connect to MongoDB
mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/taskflow', {
  useNewUrlParser: true,
  useUnifiedTopology: true,
  
})
.then(() => console.log('✅ Connected to MongoDB'))
.catch((error) => console.error('❌ MongoDB connection error:', error));
// ...existing code...

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/tasks', taskRoutes);
app.use('/api/projects', projectRoutes);
app.use('/api/documents', documentRoutes);
app.use('/api/files', fileRoutes);
app.use('/api/kanban', kanbanRoutes);
app.use('/api/users', userRoutes);
app.use('/api/analytics', analyticsRoutes);
app.use('/api/settings', settingsRoutes);
app.use('/api/subtasks', subtaskRoutes);
app.use('/api/attachments', attachmentRoutes);

// Health check endpoint
app.get('/api/health', (req, res) => {
  res.json({ status: 'OK', timestamp: new Date().toISOString() });
});

// Error handling middleware
app.use((error, req, res, next) => {
  console.error('Error:', error);
  res.status(error.status || 500).json({
    message: error.message || 'Internal server error',
    ...(process.env.NODE_ENV === 'development' && { stack: error.stack }),
  });
});

// 404 handler
app.use('*', (req, res) => {
  res.status(404).json({ message: 'Route not found' });
});

// Socket.io authentication middleware
io.use((socket, next) => {
  const token = socket.handshake.auth.token;
  if (token) {
    jwt.verify(token, process.env.JWT_SECRET || 'your-secret-key', (err, decoded) => {
      if (err) {
        return next(new Error('Authentication error'));
      }
      socket.userId = decoded.userId;
      next();
    });
  } else {
    next();
  }
});

// Socket.io connection handling
io.on('connection', (socket) => {
  console.log(`User connected: ${socket.userId || 'anonymous'}`);

  // Join project room
  socket.on('join:project', (projectId) => {
    socket.join(`project:${projectId}`);
    console.log(`User ${socket.userId} joined project ${projectId}`);
  });

  // Leave project room
  socket.on('leave:project', (projectId) => {
    socket.leave(`project:${projectId}`);
    console.log(`User ${socket.userId} left project ${projectId}`);
  });

  // Handle real-time task status changes
  socket.on('task:status:change', (data) => {
    const { taskId, newStatus, projectId } = data;
    if (projectId) {
      socket.to(`project:${projectId}`).emit('task:updated', { taskId, status: newStatus });
    } else {
      socket.broadcast.emit('task:updated', { taskId, status: newStatus });
    }
  });

  socket.on('disconnect', () => {
    console.log(`User disconnected: ${socket.userId || 'anonymous'}`);
  });
});

// Make io available to routes
app.set('io', io);

// Start server with graceful shutdown
const httpServer = server.listen(PORT, () => {
  console.log(`🚀 Server running on port ${PORT}`);
  console.log(`📊 API Health Check: http://localhost:${PORT}/api/health`);
  console.log(`🌍 Environment: ${process.env.NODE_ENV}`);
  console.log(`🔌 WebSocket server ready`);
}).on('error', (err) => {
  if (err.code === 'EADDRINUSE') {
    console.error(`❌ Port ${PORT} is already in use.`);
    console.log(`💡 Try using a different port by setting PORT in your .env file`);
    console.log(`💡 Or stop the process using port ${PORT}:`);
    console.log(`   - Windows: netstat -ano | findstr :${PORT} then taskkill /PID <PID> /F`);
    console.log(`   - Linux/macOS: lsof -ti:${PORT} | xargs kill -9`);
    process.exit(1);
  } else {
    console.error('❌ Server error:', err);
    process.exit(1);
  }
});

// Graceful shutdown
process.on('SIGTERM', () => {
  console.log('SIGTERM signal received: closing HTTP server');
  server.close(() => {
    console.log('HTTP server closed');
    mongoose.connection.close().then(() => {
      console.log('MongoDB connection closed');
      process.exit(0);
    });
  });
});

process.on('SIGINT', () => {
  console.log('SIGINT signal received: closing HTTP server');
  server.close(() => {
    console.log('HTTP server closed');
    mongoose.connection.close().then(() => {
      console.log('MongoDB connection closed');
      process.exit(0);
    });
  });
});