const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const dotenv = require('dotenv');
const cookieParser = require('cookie-parser');

// Only load .env file in development, not in production
if (process.env.NODE_ENV !== 'production') {
    dotenv.config();
}

const app = express();
const PORT = process.env.PORT || 5000;

// Middleware
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));
app.use(cookieParser());
app.use(cors({
    origin: (origin, callback) => {
        const allowedOrigins = [
            process.env.FRONTEND_URL,
            process.env.ADMIN_FRONTEND_URL,
            "https://seedite.vercel.app",
            "https://www.seedite.in",
            "https://seedite.in",
            "https://seedite-admin.vercel.app",
        ];

        // Allow requests with no origin (like mobile apps or curl requests)
        if (!origin) return callback(null, true);

        // Allow any localhost origin in development
        if (origin.startsWith('http://localhost') || allowedOrigins.includes(origin)) {
            return callback(null, true);
        }

        callback(new Error('Not allowed by CORS'));
    },
    credentials: true
}));

// Test endpoint
app.get('/api/test', (req, res) => {
    res.json({
        message: 'API is working',
        time: new Date().toISOString(),
        environment: process.env.NODE_ENV || 'development'
    });
});

// Public endpoint: signed embed URL for the homepage founder video
app.get('/api/public/founder-video', (req, res) => {
    const { getBunnyStreamUrl } = require('./config/bunny');
    const FOUNDER_VIDEO_ID = '6db29493-81b0-4404-8400-0d0ac2929349';
    const embedUrl = getBunnyStreamUrl(FOUNDER_VIDEO_ID);
    res.json({ embedUrl });
});

// Health Check with connection test
app.get('/api/health', async (req, res) => {
    try {
        // Try to ping the database for a real health check
        if (mongoose.connection.readyState === 1) {
            await mongoose.connection.db.admin().ping();
        }

        res.json({
            status: 'ok',
            time: new Date().toISOString(),
            env: process.env.NODE_ENV,
            db: mongoose.connection.readyState === 1 ? 'connected' : 'disconnected'
        });
    } catch (error) {
        res.json({
            status: 'degraded',
            time: new Date().toISOString(),
            env: process.env.NODE_ENV,
            db: 'disconnected',
            error: 'Database ping failed'
        });
    }
});

// Import routes
const authRoutes = require('./routes/authRoutes');
const courseRoutes = require('./routes/courseRoutes');
const userRoutes = require('./routes/userRoutes');
const mockTestRoutes = require('./routes/mockTestRoutes');
const adminRoutes = require('./routes/adminRoutes');
const videoRoutes = require('./routes/videoRoutes');
const paymentRoutes = require('./routes/paymentRoutes');
const couponRoutes = require('./routes/couponRoutes');
const chatbotRoutes = require('./routes/chatbotRoutes');

// Use routes
app.use('/api/auth', authRoutes);
app.use('/api/courses', courseRoutes);
app.use('/api/users', userRoutes);
app.use('/api/mock-tests', mockTestRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/videos', videoRoutes);
app.use('/api/payment', paymentRoutes);
app.use('/api/coupons', couponRoutes);
app.use('/api/chat', chatbotRoutes);
app.use('/api/upload', require('./routes/upload'));
app.use('/api/feedback', require('./routes/feedbackRoutes'));
app.use('/api/announcements', require('./routes/announcementRoutes'));
app.use('/api/blogs', require('./routes/blogRoutes'));
app.use('/api/testimonials', require('./routes/testimonialRoutes'));
app.use('/api/settings', require('./routes/settingsRoutes'));
app.use('/api/live-sessions', require('./routes/liveSessionRoutes'));
app.use('/api/admin/colleges', require('./routes/collegeAdminRoutes'));
app.use('/api/college', require('./routes/collegeRoutes'));
app.use('/api/progress', require('./routes/progressRoutes'));
app.use('/api/health', (req, res) => {
    res.json({
        status: 'ok',
        time: new Date().toISOString(),
        env: process.env.NODE_ENV,
        db: mongoose.connection.readyState === 1 ? 'connected' : 'disconnected'
    });
});

// Serve uploaded videos (for local/dev only - in prod use S3/CDN)
if (process.env.NODE_ENV !== 'production') {
    app.use('/uploads', express.static('uploads'));
}

// Root route
app.get('/', (req, res) => {
    res.json({
        message: 'Seedite Education Platform API',
        status: 'running',
        environment: process.env.NODE_ENV || 'development',
        documentation: '/api/health for status'
    });
});

// Global Error Handler
app.use((err, req, res, next) => {
    console.error('Global Error Handler:', err);
    res.status(err.status || 500).json({
        message: err.message || 'Internal Server Error',
        error: process.env.NODE_ENV === 'development' ? err.message : undefined
    });
});

// 404 handler
app.use((req, res) => {
    res.status(404).json({
        message: `Route not found: ${req.method} ${req.originalUrl}`
    });
});

// Connect to MongoDB and start server
const connectDB = require('./config/db');

connectDB()
    .then(() => {
        app.listen(PORT, () => {
            console.log(`🚀 Server running on port ${PORT}`);
            console.log(`📊 MongoDB: ${mongoose.connection.readyState === 1 ? 'Connected' : 'Disconnected'}`);
            console.log(`🌍 Environment: ${process.env.NODE_ENV || 'development'}`);
        });
    })
    .catch((err) => {
        console.error('❌ Failed to start server:', err);
        process.exit(1);
    });

module.exports = app; // For testing only