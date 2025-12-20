const express = require('express');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const router = express.Router();
const { protect } = require('../middleware/authMiddleware');
const Course = require('../models/Course');

// Admin middleware
const adminProtect = (req, res, next) => {
    if (req.user && req.user.role === 'admin') {
        next();
    } else {
        res.status(403).json({ message: 'Access denied. Admin only.' });
    }
};

// Configure multer for video uploads
const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        const uploadPath = path.join(__dirname, '../uploads/videos');
        if (!fs.existsSync(uploadPath)) {
            fs.mkdirSync(uploadPath, { recursive: true });
        }
        cb(null, uploadPath);
    },
    filename: (req, file, cb) => {
        const uniqueName = `${Date.now()}-${Math.round(Math.random() * 1E9)}${path.extname(file.originalname)}`;
        cb(null, uniqueName);
    }
});

const upload = multer({
    storage,
    limits: { fileSize: 500 * 1024 * 1024 }, // 500MB max
    fileFilter: (req, file, cb) => {
        const allowedTypes = /mp4|avi|mov|wmv|flv|mkv/;
        const extname = allowedTypes.test(path.extname(file.originalname).toLowerCase());
        const mimetype = allowedTypes.test(file.mimetype);

        if (extname && mimetype) {
            return cb(null, true);
        } else {
            cb(new Error('Only video files are allowed!'));
        }
    }
});

// @desc    Upload video
// @route   POST /api/admin/videos/upload
// @access  Admin
router.post('/upload', protect, adminProtect, upload.single('video'), (req, res) => {
    try {
        if (!req.file) {
            return res.status(400).json({ message: 'No video file uploaded' });
        }

        const videoUrl = `/api/videos/${req.file.filename}/stream`;

        res.json({
            message: 'Video uploaded successfully',
            videoId: req.file.filename,
            videoUrl: videoUrl,
            originalName: req.file.originalname,
            size: req.file.size
        });
    } catch (error) {
        res.status(500).json({ message: 'Error uploading video', error: error.message });
    }
});

// @desc    Stream video
// @route   GET /api/videos/:videoId/stream
// @access  Protected (enrolled users only)
router.get('/:videoId/stream', async (req, res, next) => {
    // Custom middleware logic to handle query token
    if (req.query.token) {
        req.headers.authorization = `Bearer ${req.query.token}`;
    }
    next();
}, protect, async (req, res) => {
    try {
        const videoPath = path.join(__dirname, '../uploads/videos', req.params.videoId);

        if (!fs.existsSync(videoPath)) {
            return res.status(404).json({ message: 'Video not found' });
        }

        // Get video stats
        const stat = fs.statSync(videoPath);
        const fileSize = stat.size;
        const range = req.headers.range;

        if (range) {
            // Handle range requests for video seeking
            const parts = range.replace(/bytes=/, "").split("-");
            const start = parseInt(parts[0], 10);
            const end = parts[1] ? parseInt(parts[1], 10) : fileSize - 1;
            const chunksize = (end - start) + 1;
            const file = fs.createReadStream(videoPath, { start, end });
            const head = {
                'Content-Range': `bytes ${start}-${end}/${fileSize}`,
                'Accept-Ranges': 'bytes',
                'Content-Length': chunksize,
                'Content-Type': 'video/mp4',
            };
            res.writeHead(206, head);
            file.pipe(res);
        } else {
            // No range, send entire video
            const head = {
                'Content-Length': fileSize,
                'Content-Type': 'video/mp4',
            };
            res.writeHead(200, head);
            fs.createReadStream(videoPath).pipe(res);
        }
    } catch (error) {
        console.error(error);
        // Don't send JSON if headers already sent (streaming)
        if (!res.headersSent) {
            res.status(500).json({ message: 'Error streaming video' });
        }
    }
});

// @desc    Delete video
// @route   DELETE /api/admin/videos/:videoId
// @access  Admin
router.delete('/:videoId', protect, adminProtect, (req, res) => {
    try {
        const videoPath = path.join(__dirname, '../uploads/videos', req.params.videoId);

        if (fs.existsSync(videoPath)) {
            fs.unlinkSync(videoPath);
            res.json({ message: 'Video deleted successfully' });
        } else {
            res.status(404).json({ message: 'Video not found' });
        }
    } catch (error) {
        res.status(500).json({ message: 'Error deleting video', error: error.message });
    }
});

module.exports = router;
